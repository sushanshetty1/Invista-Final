'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface UseIndustryCategoriesReturn {
    categories: string[]
    loading: boolean
    error: string | null
    industry: string | null
}

export function useIndustryCategories(): UseIndustryCategoriesReturn {
    const [categories, setCategories] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [industry, setIndustry] = useState<string | null>(null)

    const { user } = useAuth()

    useEffect(() => {
        const fetchIndustryCategories = async () => {
            try {
                setLoading(true);
                setError(null);

                console.log('🔍 Fetching industry categories...');

                // Call the test API endpoint to get user's industry and categories
                const response = await fetch('/api/inventory/industry-categories-test', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                console.log('📡 API Response status:', response.status);

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to fetch industry');
                }

                const data = await response.json();
                console.log('📋 Received data:', data);

                setIndustry(data.industry);
                setCategories(data.categories || []);

                console.log(`✅ Loaded ${data.categories?.length || 0} categories for ${data.industry} industry`);
            } catch (err) {
                console.error('❌ Error fetching user industry:', err);
                setError('Failed to load company industry');
                setCategories([]);
                setIndustry(null);
            } finally {
                setLoading(false);
            }
        };

        fetchIndustryCategories();
    }, [user?.id]);

    return {
        categories,
        loading,
        error,
        industry
    };
}
