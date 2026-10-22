import { writable } from 'svelte/store';

export type PageRoute = 'landing' | 'map' | 'vendor' | 'settings' | 'intent' | 'search';

function createRouter() {
  const getInitialRoute = (): PageRoute => {
    if (typeof window === 'undefined') return 'landing';
    const hash = window.location.hash.replace('#/', '').replace('#', '').trim();
    if (hash === 'map') return 'map';
    if (hash === 'vendor') return 'vendor';
    if (hash === 'settings') return 'settings';
    if (hash === 'intent') return 'intent';
    if (hash === 'search') return 'search';
    return 'landing';
  };

  const { subscribe, set } = writable<PageRoute>(getInitialRoute());

  if (typeof window !== 'undefined') {
    window.addEventListener('hashchange', () => {
      set(getInitialRoute());
    });
  }

  return {
    subscribe,
    navigate: (route: PageRoute) => {
      if (typeof window !== 'undefined') {
        window.location.hash = `#/${route}`;
      }
      set(route);
    },
  };
}

export const router = createRouter();
