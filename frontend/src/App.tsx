import { Provider } from 'react-redux';
import { store, useAppSelector } from './store';
import { AuthPortal } from './components/AuthPortal';
import CodeCity3DWorldPage from './app/world/page';

function CodeCityAppContent() {
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);

  // If user is NOT logged in, show Auth Gate (Login/Signup with GitHub, Google, Email+OTP)
  if (!isAuthenticated) {
    return <AuthPortal />;
  }

  return <CodeCity3DWorldPage />;
}

export function App() {
  return (
    <Provider store={store}>
      <CodeCityAppContent />
    </Provider>
  );
}

export default App;
