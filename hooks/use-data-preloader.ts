import { useEffect } from 'react';

interface DataPreloader {
  preloadCompanyData: (userId: string) => Promise<void>;
  preloadUserPermissions: (userId: string, companyId: string) => Promise<void>;
}

class DataPreloaderService implements DataPreloader {
  private cache = new Map<string, { data: any; timestamp: number; expiry: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private preloadPromises = new Map<string, Promise<void>>();

  private setCachedData(key: string, data: any, duration = this.CACHE_DURATION) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + duration
    });
  }

  private getCachedData(key: string) {
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  async preloadCompanyData(userId: string): Promise<void> {
    const cacheKey = `company-${userId}`;
    
    // Check if already cached
    if (this.getCachedData(cacheKey)) {
      return;
    }

    // Check if preload is already in progress
    if (this.preloadPromises.has(cacheKey)) {
      return this.preloadPromises.get(cacheKey);
    }

    const preloadPromise = this.fetchAndCacheCompanyData(userId, cacheKey);
    this.preloadPromises.set(cacheKey, preloadPromise);

    try {
      await preloadPromise;
    } finally {
      this.preloadPromises.delete(cacheKey);
    }
  }

  private async fetchAndCacheCompanyData(userId: string, cacheKey: string): Promise<void> {
    try {
      const response = await fetch(`/api/companies?userId=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        this.setCachedData(cacheKey, data);
        
        // Also preload team members if we have a company
        if (data.company?.id) {
          this.preloadTeamMembers(data.company.id);
        }
      }
    } catch (error) {
      console.error('Error preloading company data:', error);
    }
  }

  private async preloadTeamMembers(companyId: string): Promise<void> {
    const teamCacheKey = `team-${companyId}`;
    
    if (this.getCachedData(teamCacheKey)) {
      return;
    }

    try {
      const response = await fetch(`/api/companies/${companyId}/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        this.setCachedData(teamCacheKey, data.teamMembers || [], 2 * 60 * 1000); // 2 minutes
      }
    } catch (error) {
      console.error('Error preloading team members:', error);
    }
  }

  async preloadUserPermissions(userId: string, companyId: string): Promise<void> {
    const cacheKey = `permissions-${userId}-${companyId}`;
    
    if (this.getCachedData(cacheKey)) {
      return;
    }

    try {
      // This would be implemented if we had a permissions API
      // For now, permissions are loaded with company data
    } catch (error) {
      console.error('Error preloading user permissions:', error);
    }
  }

  clearCache(): void {
    this.cache.clear();
    this.preloadPromises.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }
}

// Singleton instance
export const dataPreloader = new DataPreloaderService();

// React hook for preloading data
export function useDataPreloader(userId?: string, companyId?: string) {
  useEffect(() => {
    if (userId) {
      // Preload company data as soon as we have a user ID
      dataPreloader.preloadCompanyData(userId);
    }
  }, [userId]);

  useEffect(() => {
    if (userId && companyId) {
      // Preload permissions when we have both user and company
      dataPreloader.preloadUserPermissions(userId, companyId);
    }
  }, [userId, companyId]);

  return {
    preloadCompanyData: dataPreloader.preloadCompanyData,
    preloadUserPermissions: dataPreloader.preloadUserPermissions,
    clearCache: dataPreloader.clearCache,
    getCacheSize: dataPreloader.getCacheSize
  };
}
