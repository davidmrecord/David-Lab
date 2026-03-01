import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useTheme } from '../theme/ThemeContext';
import { SPACING, FONT } from './theme';

// Screens
import JournalListScreen from '../screens/JournalListScreen';
import TripDetailScreen from '../screens/TripDetailScreen';
import CatchDetailScreen from '../screens/CatchDetailScreen';
import EditCatchScreen from '../screens/EditCatchScreen';
import EditTripScreen from '../screens/EditTripScreen';
import NewTripScreen from '../screens/NewTripScreen';
import SettingsScreen from '../screens/SettingsScreen';
import GearLibraryScreen from '../screens/GearLibraryScreen';
import AddGearScreen from '../screens/AddGearScreen';
import NewEntryFlow from '../screens/NewEntryFlow';
import GalleryScreen from '../screens/GalleryScreen';

// ---------------------------------------------------------------------------
// Route param types
// ---------------------------------------------------------------------------

export type JournalStackParams = {
  JournalList: undefined;
  TripDetail: { tripId: number };
  CatchDetail: { catchId: number };
  EditCatch: { catchId: number };
  EditTrip: { tripId: number };
  NewEntry: { tripId?: number } | undefined;
  NewTrip: undefined;
  Settings: undefined;
};

export type GearStackParams = {
  GearLibrary: undefined;
  AddGear: { gearId?: number } | undefined;
};

export type GalleryStackParams = {
  GalleryList: undefined;
  CatchDetail: { catchId: number };
  EditCatch: { catchId: number };
};

export type JournalScreenProps<T extends keyof JournalStackParams> =
  NativeStackScreenProps<JournalStackParams, T>;

export type GearScreenProps<T extends keyof GearStackParams> =
  NativeStackScreenProps<GearStackParams, T>;

export type GalleryScreenProps<T extends keyof GalleryStackParams> =
  NativeStackScreenProps<GalleryStackParams, T>;

// ---------------------------------------------------------------------------
// Stacks
// ---------------------------------------------------------------------------

const JournalStack = createNativeStackNavigator<JournalStackParams>();
const GearStack = createNativeStackNavigator<GearStackParams>();
const GalleryStack = createNativeStackNavigator<GalleryStackParams>();
const Tab = createBottomTabNavigator();

function JournalNavigator() {
  const { colors } = useTheme();
  return (
    <JournalStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.textOnPrimary,
        headerTitleStyle: { fontWeight: String(FONT.semibold) as any },
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <JournalStack.Screen
        name="JournalList"
        component={JournalListScreen}
        options={{ title: 'Journal' }}
      />
      <JournalStack.Screen
        name="TripDetail"
        component={TripDetailScreen}
        options={{ title: 'Trip' }}
      />
      <JournalStack.Screen
        name="CatchDetail"
        component={CatchDetailScreen}
        options={{ title: 'Catch' }}
      />
      <JournalStack.Screen
        name="EditCatch"
        component={EditCatchScreen}
        options={{ title: 'Edit Catch' }}
      />
      <JournalStack.Screen
        name="EditTrip"
        component={EditTripScreen}
        options={{ title: 'Edit Trip' }}
      />
      <JournalStack.Screen
        name="NewEntry"
        component={NewEntryFlow}
        options={{ title: 'New Catch', presentation: 'modal' }}
      />
      <JournalStack.Screen
        name="NewTrip"
        component={NewTripScreen}
        options={{ title: 'New Trip', presentation: 'modal' }}
      />
      <JournalStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings', presentation: 'modal' }}
      />
    </JournalStack.Navigator>
  );
}

function GearNavigator() {
  const { colors } = useTheme();
  return (
    <GearStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.textOnPrimary,
        headerTitleStyle: { fontWeight: String(FONT.semibold) as any },
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <GearStack.Screen
        name="GearLibrary"
        component={GearLibraryScreen}
        options={{ title: 'Gear' }}
      />
      <GearStack.Screen
        name="AddGear"
        component={AddGearScreen}
        options={{ title: 'Add Gear' }}
      />
    </GearStack.Navigator>
  );
}

function GalleryNavigator() {
  const { colors } = useTheme();
  return (
    <GalleryStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.textOnPrimary,
        headerTitleStyle: { fontWeight: String(FONT.semibold) as any },
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <GalleryStack.Screen
        name="GalleryList"
        component={GalleryScreen}
        options={{ title: 'Gallery' }}
      />
      <GalleryStack.Screen
        name="CatchDetail"
        component={CatchDetailScreen as any}
        options={{ title: 'Catch' }}
      />
      <GalleryStack.Screen
        name="EditCatch"
        component={EditCatchScreen as any}
        options={{ title: 'Edit Catch' }}
      />
    </GalleryStack.Navigator>
  );
}

const NAV_THEME = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: 'transparent' } };

export default function AppNavigator() {
  const { colors } = useTheme();
  return (
    <NavigationContainer theme={NAV_THEME}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarLabelStyle: { fontSize: FONT.sm, fontWeight: String(FONT.medium) as any },
        }}
      >
        <Tab.Screen
          name="JournalTab"
          component={JournalNavigator}
          options={{ tabBarLabel: 'Journal', tabBarIcon: () => <Text>🎣</Text> }}
        />
        <Tab.Screen
          name="GearTab"
          component={GearNavigator}
          options={{ tabBarLabel: 'Gear', tabBarIcon: () => <Text>🪝</Text> }}
        />
        <Tab.Screen
          name="GalleryTab"
          component={GalleryNavigator}
          options={{ tabBarLabel: 'Gallery', tabBarIcon: () => <Text>📷</Text> }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
