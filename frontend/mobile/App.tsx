import { useEffect } from "react";

import {
  NavigationContainer,
} from "@react-navigation/native";

import {
  createNativeStackNavigator,
} from "@react-navigation/native-stack";

import HomeScreen from "./src/screens/HomeScreen";
import HistoryScreen from "./src/screens/HistoryScreen";
import PoiDetailScreen from "./src/screens/PoiDetailScreen";
import MapScreen from "./src/screens/MapScreen";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import AddPoiScreen from "./src/screens/AddPoiScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import ChatScreen from "./src/screens/ChatScreen";

import { useAppStore } from "./src/store/useAppStore";
import { usePoiStore } from "./src/store/usePoiStore";
import { getTranslations } from "./src/translations";

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  History: undefined;

  PoiDetail: {
    poiId: number;
    autoPlay?: boolean;
  };

  Map: {
    poiId?: number;
  };

  Register: undefined;
  Profile: undefined;
  AddPoi: undefined;
  Chat: undefined;
};

const Stack =
  createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const language = useAppStore(
    (state) => state.language
  );

  const initialized = useAppStore(
    (state) => state.initialized
  );

  const isLoggedIn = useAppStore(
    (state) => state.isLoggedIn
  );

  const token = useAppStore(
    (state) => state.token
  );

  const loadLanguage = useAppStore(
    (state) => state.loadLanguage
  );

  const loadPois = usePoiStore(
    (state) => state.loadPois
  );

  const resetPois = usePoiStore(
    (state) => state.resetPois
  );

  useEffect(() => {
    loadLanguage();
  }, [loadLanguage]);

  useEffect(() => {
    if (!initialized) {
      return;
    }

    if (!isLoggedIn || !token) {
      resetPois();
      return;
    }

    void loadPois(token).catch((error) => {
      console.warn(
        "Failed to load POIs:",
        error
      );
    });
  }, [
    initialized,
    isLoggedIn,
    token,
    loadPois,
    resetPois,
  ]);

  const texts = getTranslations(language);

  if (!initialized) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerBackTitle: "",
        }}
      >
        {!isLoggedIn ? (
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{
                headerShown: false,
              }}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{
                headerShown: false,
              }}
            />

            <Stack.Screen
              name="History"
              component={HistoryScreen}
              options={{
                title: texts.history.title,
              }}
            />

            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{
                title: texts.common.profile,
              }}
            />

            <Stack.Screen
              name="AddPoi"
              component={AddPoiScreen}
              options={{
                title: texts.addPoi.title,
              }}
            />

            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={{
                title: "AI Tour Guide",
              }}
            />

            <Stack.Screen
              name="PoiDetail"
              component={PoiDetailScreen}
              options={{
                title: texts.common.viewDetail,
              }}
            />

            <Stack.Screen
              name="Map"
              component={MapScreen}
              options={{
                title: texts.common.map,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}