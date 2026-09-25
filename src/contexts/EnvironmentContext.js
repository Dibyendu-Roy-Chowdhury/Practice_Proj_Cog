import React, { createContext, useContext, useState } from 'react';
import { setActiveEnvironment } from '../services/API_services';

export const EnvironmentContext = createContext({ env: 'production', setEnv: () => {} });
export const useEnvironment = () => useContext(EnvironmentContext);

// Prime the API layer at module load time so the very first render sees correct data.
setActiveEnvironment('production');

export function EnvironmentProvider({ children }) {
  const [env, setEnvState] = useState('production');

  // Keep the API services layer in sync synchronously on every render so child
  // components that call environment-scoped API functions always see the correct env.
  setActiveEnvironment(env);

  const setEnv = (newEnv) => {
    setEnvState(newEnv);
  };

  return (
    <EnvironmentContext.Provider value={{ env, setEnv }}>
      {children}
    </EnvironmentContext.Provider>
  );
}
