import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Types
interface User {
  id: string;
  email: string;
  name: string;
  groups?: string[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

interface AuthProviderProps {
  children: ReactNode;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Mock authentication service (replace with AWS Cognito)
class MockAuthService {
  private static instance: MockAuthService;
  private currentUser: User | null = null;

  static getInstance(): MockAuthService {
    if (!MockAuthService.instance) {
      MockAuthService.instance = new MockAuthService();
    }
    return MockAuthService.instance;
  }

  async login(email: string, password: string): Promise<User> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock validation
    if (email === 'admin@nexus-ena.com' && password === 'admin123') {
      const user: User = {
        id: '1',
        email: 'admin@nexus-ena.com',
        name: 'Admin User',
        groups: ['admin', 'analyst']
      };
      this.currentUser = user;
      localStorage.setItem('nexus_ena_user', JSON.stringify(user));
      return user;
    } else if (email === 'analyst@nexus-ena.com' && password === 'analyst123') {
      const user: User = {
        id: '2',
        email: 'analyst@nexus-ena.com',
        name: 'Energy Analyst',
        groups: ['analyst']
      };
      this.currentUser = user;
      localStorage.setItem('nexus_ena_user', JSON.stringify(user));
      return user;
    } else {
      throw new Error('Invalid email or password');
    }
  }

  async logout(): Promise<void> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    this.currentUser = null;
    localStorage.removeItem('nexus_ena_user');
  }

  getCurrentUser(): User | null {
    if (this.currentUser) {
      return this.currentUser;
    }

    // Check localStorage for persisted user
    const storedUser = localStorage.getItem('nexus_ena_user');
    if (storedUser) {
      try {
        this.currentUser = JSON.parse(storedUser);
        return this.currentUser;
      } catch (error) {
        localStorage.removeItem('nexus_ena_user');
      }
    }

    return null;
  }

  async validateSession(): Promise<boolean> {
    // Simulate session validation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const user = this.getCurrentUser();
    return user !== null;
  }
}

// Auth Provider Component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authService = MockAuthService.getInstance();

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        
        // Check for existing session
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
          // Validate session with backend
          const isValid = await authService.validateSession();
          if (isValid) {
            setUser(currentUser);
          } else {
            // Session expired, clear user
            await authService.logout();
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setError('Failed to initialize authentication');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const loggedInUser = await authService.login(email, password);
      setUser(loggedInUser);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      await authService.logout();
      setUser(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Logout failed';
      setError(errorMessage);
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    login,
    logout,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;