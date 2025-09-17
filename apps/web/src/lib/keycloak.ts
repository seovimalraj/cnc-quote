import Keycloak from 'keycloak-js';

const keycloakConfig = {
  url: process.env.NEXT_PUBLIC_KEYCLOAK_URL || 'https://quote.frigate.ai/security',
  realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'cnc-quote',
  clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'cnc-quote-web',
};

let keycloak: Keycloak.KeycloakInstance | null = null;

export const getKeycloakInstance = () => {
  if (!keycloak) {
    keycloak = new Keycloak(keycloakConfig);
  }
  return keycloak;
};

export const initKeycloak = async () => {
  const kc = getKeycloakInstance();
  try {
    const authenticated = await kc.init({
      onLoad: 'check-sso',
      silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
      checkLoginIframe: false,
    });
    return { authenticated, keycloak: kc };
  } catch (error) {
    console.error('Keycloak initialization failed:', error);
    return { authenticated: false, keycloak: kc };
  }
};

export const login = () => {
  const kc = getKeycloakInstance();
  kc.login();
};

export const logout = () => {
  const kc = getKeycloakInstance();
  kc.logout();
};

export const getToken = () => {
  const kc = getKeycloakInstance();
  return kc.token;
};

export const isAuthenticated = () => {
  const kc = getKeycloakInstance();
  return kc.authenticated;
};

export const updateToken = async () => {
  const kc = getKeycloakInstance();
  try {
    await kc.updateToken(70);
    return true;
  } catch (error) {
    console.error('Token update failed:', error);
    return false;
  }
};