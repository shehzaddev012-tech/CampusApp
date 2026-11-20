import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { EventsScreen } from '../features/events/EventsScreen';
import { HomeScreen } from '../features/home/HomeScreen';
import { PhotosScreen } from '../features/photos/PhotosScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { SocietiesScreen } from '../features/societies/SocietiesScreen';
import { useTheme } from '../theme';
import { TabBar } from './TabBar';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      tabBar={props => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        sceneStyle: { backgroundColor: colors.background },
      }}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Events" component={EventsScreen} options={{ title: 'Events' }} />
      <Tab.Screen name="Photos" component={PhotosScreen} options={{ title: 'Photos' }} />
      <Tab.Screen name="Societies" component={SocietiesScreen} options={{ title: 'Societies' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}
