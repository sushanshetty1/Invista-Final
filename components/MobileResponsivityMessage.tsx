'use client';

import { useEffect, useState } from 'react';
import { Smartphone, Wrench, Monitor } from 'lucide-react';

export function MobileResponsivityMessage() {
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setIsMobile(width < 768);
      setIsLandscape(width > height && width < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

  if (!isMobile) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className={`flex h-full items-center justify-center mobile-responsivity-container ${
        isLandscape ? 'p-3 sm:p-4' : 'p-4 sm:p-6'
      }`}>
        <div className={`w-full text-center mobile-responsivity-content ${
          isLandscape 
            ? 'max-w-lg space-y-2 sm:space-y-3' 
            : 'max-w-sm xs:max-w-md space-y-4 sm:space-y-6'
        }`}>
          {/* Icon with animation - responsive sizing */}
          <div className={`mx-auto flex items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/20 ${
            isLandscape 
              ? 'h-12 w-12 sm:h-16 sm:w-16' 
              : 'h-16 w-16 xs:h-20 xs:w-20'
          }`}>
            <div className="relative">
              <Smartphone className={`text-primary ${
                isLandscape ? 'h-6 w-6 sm:h-7 sm:w-7' : 'h-7 w-7 xs:h-8 xs:w-8'
              }`} />
              <Wrench className={`absolute -right-0.5 -top-0.5 animate-pulse text-chart-4 ${
                isLandscape ? 'h-3 w-3' : 'h-3 w-3 xs:h-4 xs:w-4'
              }`} />
            </div>
          </div>

          {/* Main message - responsive text sizing */}
          <div className={isLandscape ? 'space-y-2' : 'space-y-2 xs:space-y-3'}>
            <h2 className={`font-semibold tracking-tight text-foreground ${
              isLandscape 
                ? 'text-lg sm:text-xl' 
                : 'text-xl xs:text-2xl'
            }`}>
              Mobile Experience
            </h2>
            <p className={`font-medium text-primary ${
              isLandscape 
                ? 'text-sm sm:text-base' 
                : 'text-base xs:text-lg'
            }`}>
              Working on Responsivity
            </p>
            <p className={`text-muted-foreground leading-relaxed ${
              isLandscape 
                ? 'text-xs sm:text-sm px-2' 
                : 'text-xs xs:text-sm px-1'
            }`}>
              We're currently optimizing the mobile experience for this application. 
              For the best experience, please use a desktop or tablet device.
            </p>
          </div>

          {/* Progress indicator */}
          <div className={isLandscape ? 'space-y-1.5' : 'space-y-2'}>
            <div className={`rounded-full bg-secondary overflow-hidden ${
              isLandscape ? 'h-1.5 mx-4' : 'h-2'
            }`}>
              <div className="h-full bg-gradient-to-r from-primary via-chart-2 to-chart-3 rounded-full animate-pulse w-3/4"></div>
            </div>
            <p className={`text-muted-foreground ${
              isLandscape ? 'text-xs' : 'text-xs'
            }`}>
              Enhanced mobile support coming soon
            </p>
          </div>

          {/* Desktop suggestion for landscape */}
          {isLandscape && (
            <div className="flex items-center justify-center space-x-2 pt-2">
              <Monitor className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                Try rotating to portrait or use desktop
              </p>
            </div>
          )}

          {/* Footer note */}
          <div className={`border-t border-border ${
            isLandscape ? 'pt-2' : 'pt-3 xs:pt-4'
          }`}>
            <p className="text-xs text-muted-foreground">
              Invista • Inventory Management System
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}