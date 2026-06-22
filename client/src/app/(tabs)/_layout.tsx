import React from 'react';
import { AnimatedSplashOverlay } from '@/components/animations/animated-icon';
import AppTabs from '@/components/navigation/app-tabs';

export default function TabLayout() {
  return (
    <>
      <AnimatedSplashOverlay />
      <AppTabs />
    </>
  );
}
