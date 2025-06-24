'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { dataPreloader } from '@/hooks/use-data-preloader'

type AuthContextType = {
    user: any
    loading: boolean
    userType: 'company' | 'individual' | null
    hasCompanyAccess: boolean
    signUp: (email: string, password: string) => Promise<any>
    login: (email: string, password: string) => Promise<any>
    signInWithGoogle: () => Promise<any>
    logout: () => Promise<void>
    resetPassword: (email: string) => Promise<any>
    deleteAccount: () => Promise<any>
    checkUserAccess: () => Promise<void>
    refreshAccess: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [userType, setUserType] = useState<'company' | 'individual' | null>(null)
    const [hasCompanyAccess, setHasCompanyAccess] = useState(false)
    const router = useRouter()
    
    // Add debouncing to prevent multiple rapid access checks
    const [lastAccessCheck, setLastAccessCheck] = useState<number>(0)
    const ACCESS_CHECK_DEBOUNCE = 1000 // 1 second
    
    const checkUserAccess = async () => {
        if (!user?.email || !user?.id) {
            setUserType(null);
            setHasCompanyAccess(false);
            return;
        }
        
        // Debouncing - prevent multiple rapid checks
        const now = Date.now();
        if (now - lastAccessCheck < ACCESS_CHECK_DEBOUNCE) {
            console.log('AuthContext - Access check debounced');
            return;
        }
        setLastAccessCheck(now);
        
        console.log('AuthContext - Checking user access');
        
        // First check if user previously had access (permanent flag)
        if (typeof window !== 'undefined') {
            const hasBeenGrantedAccess = localStorage.getItem(`invista_has_access_${user.id}`) === 'true';
            if (hasBeenGrantedAccess) {
                console.log('AuthContext - User previously had access, setting hasCompanyAccess to true');
                setUserType('company');
                setHasCompanyAccess(true);
                return;
            }
        }try {
            // Optimized single query approach - check for company access first
            const { data: companyUserData, error: companyUserError } = await supabase
                .from('company_users')
                .select(`
                    id,
                    role,
                    isOwner,
                    isActive,
                    companyId,
                    userId,
                    company:companies!inner(id, name, isActive)
                `)
                .eq('userId', user.id)
                .eq('isActive', true)
                .eq('company.isActive', true)
                .limit(1);

            if (!companyUserError && companyUserData && companyUserData.length > 0) {
                console.log('AuthContext - User found in company_users');
                setUserType('company');
                setHasCompanyAccess(true);
                if (typeof window !== 'undefined') {
                    localStorage.setItem(`invista_has_access_${user.id}`, 'true');
                }
                return;
            }

            // If not found as company user, check if user owns a company
            const { data: ownedCompany, error: ownedError } = await supabase
                .from('companies')
                .select('id, name, createdBy')
                .eq('createdBy', user.id)
                .eq('isActive', true)
                .limit(1);

            if (!ownedError && ownedCompany && ownedCompany.length > 0) {
                console.log('AuthContext - User owns a company');
                setUserType('company');
                setHasCompanyAccess(true);
                if (typeof window !== 'undefined') {
                    localStorage.setItem(`invista_has_access_${user.id}`, 'true');
                }
                return;
            }

            // Final fallback - check user invitations by email
            const { data: inviteData, error: inviteError } = await supabase
                .from('user_invitations')
                .select('id, status, email')
                .eq('email', user.email)
                .eq('status', 'ACCEPTED')
                .limit(1);

            if (!inviteError && inviteData && inviteData.length > 0) {
                console.log('AuthContext - User has accepted invitation');
                setUserType('individual');
                setHasCompanyAccess(true);
                if (typeof window !== 'undefined') {
                    localStorage.setItem(`invista_has_access_${user.id}`, 'true');
                }
                return;
            }

            // If we reach here, no company access was found
            setUserType('individual');
            setHasCompanyAccess(false);
            
            console.log(`AuthContext - No access found for user ${user.email}`);
            
        } catch (error) {
            console.error('AuthContext - Error checking user access:', error);
            setUserType('individual');
            setHasCompanyAccess(false);
        }
    }
    
    useEffect(() => {
        let isMounted = true;
        let subscription: { unsubscribe: () => void } | undefined;
        
        const initializeAuth = async () => {
            try {
                console.log('AuthContext - Initializing auth state');
                
                // Set a timeout to prevent infinite loading
                const timeoutId = setTimeout(() => {
                    if (isMounted) {
                        console.log('AuthContext - Auth initialization timeout, setting loading to false');
                        setLoading(false);
                    }
                }, 10000); // 10 seconds timeout
                
                // First, get the current session
                const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
                const currentSession = sessionData?.session;
                
                if (sessionError) {
                    console.error('AuthContext - Error getting session:', sessionError);
                }
                
                if (isMounted) {
                    clearTimeout(timeoutId);
                      if (currentSession?.user) {
                        console.log('AuthContext - Session found:', currentSession.user.email);
                        setUser(currentSession.user);
                        
                        // Check user access and start preloading
                        try {
                            await checkUserAccess();
                            // Start preloading company data in the background
                            dataPreloader.preloadCompanyData(currentSession.user.id).catch(console.error);
                        } catch (accessError) {
                            console.error('AuthContext - Error checking user access:', accessError);
                            // Don't fail initialization if access check fails
                        }
                    } else {
                        console.log('AuthContext - No session found');
                        setUser(null);
                        setUserType(null);
                        setHasCompanyAccess(false);
                    }
                    
                    // Only set loading to false after we've fully initialized
                    setLoading(false);
                }
                
                // Set up the auth state change listener
                const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
                    if (!isMounted) return;
                    
                    console.log('AuthContext - Auth state change:', event);
                    
                    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                        if (session?.user) {
                            console.log('AuthContext - User signed in or token refreshed:', session.user.email);
                            setUser(session.user);
                            
                            // Handle Google sign-in user creation
                            const { data: existingUser } = await supabase
                                .from('users')
                                .select('id')
                                .eq('id', session.user.id)
                                .single();

                            if (!existingUser && isMounted) {
                                // Create user record for Google sign-in
                                const fullName = session.user.user_metadata?.full_name || '';
                                const [firstName = '', lastName = ''] = fullName.split(' ');
                                
                                await supabase
                                    .from('users')
                                    .insert({
                                        id: session.user.id,
                                        email: session.user.email || '',
                                        firstName: firstName || null,
                                        lastName: lastName || null,
                                        displayName: fullName || null,
                                        avatar: session.user.user_metadata?.avatar_url || null,
                                        phone: session.user.user_metadata?.phone || null,
                                        timezone: 'UTC',
                                        language: 'en',
                                        theme: 'system',
                                        isActive: true,
                                        isVerified: true,
                                        emailVerified: session.user.email_confirmed_at ? true : false,
                                        twoFactorEnabled: false,
                                        failedLoginCount: 0,
                                        createdAt: new Date().toISOString(),
                                        updatedAt: new Date().toISOString()
                                    });
                            }
                              // Only check user access for new sign-ins, not token refreshes
                            if (event === 'SIGNED_IN' && isMounted) {
                                // Small delay to allow user creation to complete, then start preloading
                                setTimeout(async () => {
                                    await checkUserAccess();
                                    // Start preloading company data in the background
                                    if (session.user.id) {
                                        dataPreloader.preloadCompanyData(session.user.id).catch(console.error);
                                    }
                                }, 500);
                            }
                        }
                    } else if (event === 'SIGNED_OUT') {
                        console.log('AuthContext - User signed out');
                        if (isMounted) {
                            setUser(null);
                            setUserType(null);
                            setHasCompanyAccess(false);
                        }
                    }
                });
                
                subscription = data.subscription;
            } catch (error) {
                console.error('Error initializing auth:', error);
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        initializeAuth();

        return () => {
            isMounted = false;
            if (subscription) {
                subscription.unsubscribe();
            }
        };
    }, [])

    const signUp = async (email: string, password: string) => {
        return await supabase.auth.signUp({ email, password })
    }

    const login = async (email: string, password: string) => {
        return await supabase.auth.signInWithPassword({ email, password })
    }

    const signInWithGoogle = async () => {
        return await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`
            }
        })
    }
    
    const logout = async () => {
        try {
            console.log('AuthContext - Starting logout process');
            
            // Clear localStorage access flags
            if (typeof window !== 'undefined' && user?.id) {
                localStorage.removeItem(`invista_has_access_${user.id}`);
                console.log('AuthContext - Cleared localStorage access flags');
            }
            
            // Sign out from Supabase
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('AuthContext - Error during signout:', error);
                throw error;
            }
            
            console.log('AuthContext - Successfully signed out from Supabase');
            
            // Clear local state immediately
            setUser(null);
            setUserType(null);
            setHasCompanyAccess(false);
            
            // Redirect to home page
            router.push('/');
        } catch (error) {
            console.error('AuthContext - Logout error:', error);
            // Even if there's an error, clear local state and redirect
            setUser(null);
            setUserType(null);
            setHasCompanyAccess(false);
            router.push('/');
        }
    }

    const resetPassword = async (email: string) => {
        return await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${location.origin}/auth/reset-password`,
        })
    }

    const deleteAccount = async () => {
        const {
            data: { user },
            error,
        } = await supabase.auth.getUser()

        if (user) {
            return await supabase.rpc('delete_user', { uid: user.id })
        }

        return { error: { message: 'No user found' } }
    }

    const refreshAccess = async () => {
        console.log('AuthContext - Manual refresh access requested');
        await checkUserAccess();
    }

    return (
        <AuthContext.Provider value={{ 
            user, 
            loading, 
            userType, 
            hasCompanyAccess,
            signUp, 
            login, 
            signInWithGoogle, 
            logout, 
            resetPassword, 
            deleteAccount,
            checkUserAccess,
            refreshAccess
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) throw new Error('useAuth must be used within AuthProvider')
    return context
}
