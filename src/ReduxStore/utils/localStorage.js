// utils/localStorage.js

export const saveState = (state) => {
    try {
      const serializedState = JSON.stringify(state);
      localStorage.setItem('state', serializedState);
    } catch (err) {
      console.error('Could not save state', err);
    }
  };
  
  export const loadState = () => {
    try {
      const serializedState = localStorage.getItem('state');
      if (serializedState === null) {
        return undefined;
      }
      return JSON.parse(serializedState);
    } catch (err) {
      console.error('Could not load state', err);
      return undefined;
    }
  };


  export const deleteStateKey = (key) => {
    try {
        const serializedState = localStorage.getItem('state');
        if (serializedState === null) {
            return;
        }
        const state = JSON.parse(serializedState);
        delete state[key];
        localStorage.setItem('state', JSON.stringify(state));
    } catch (err) {
        console.error(`Could not delete key ${key} from state`, err);
    }
  }
  