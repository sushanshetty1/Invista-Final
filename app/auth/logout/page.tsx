'use client'
import React, { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Package } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function LogoutPage() {
    const { logout, user } = useAuth()
    const [isLoggingOut, setIsLoggingOut] = useState(false)
    const router = useRouter()

    useEffect(() => {
        const performLogout = async () => {
            if (isLoggingOut) return // Prevent multiple logout attempts
            
            setIsLoggingOut(true)
            
            try {
                if (user) {
                    console.log('Logout page - User found, performing logout')
                    await logout()
                } else {
                    console.log('Logout page - No user found, redirecting to home')
                    // If no user, just redirect to home
                    setTimeout(() => {
                        router.push('/')
                    }, 1000)
                }
            } catch (error) {
                console.error('Logout page - Error during logout:', error)
                // Even on error, redirect to home after a delay
                setTimeout(() => {
                    router.push('/')
                }, 2000)
            }
        }
        
        performLogout()
    }, [logout, user, router, isLoggingOut])

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50/90 via-blue-50/40 to-indigo-50/60 dark:from-background dark:via-muted/20 dark:to-chart-3/10 flex items-center justify-center px-4">
            <div className="max-w-md w-full space-y-8 text-center">
                <div className="flex justify-center">
                    <Package className="h-12 w-12 text-primary animate-pulse" />
                </div>
                <h2 className="text-3xl font-bold text-foreground">
                    Signing you out...
                </h2>
                <p className="text-muted-foreground">
                    Please wait while we securely sign you out of your account.
                </p>
            </div>
        </div>
    )
}
