import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SidebarProvider } from './context/SidebarContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import RoleGuard from './components/RoleGuard';
import GenerateButton from './components/GenerateButton';
import ImageUploader from './components/ImageUploader';
import DocButton from './components/DocButton';
import PreviewPage from './pages/PreviewPage';
import LoginPage from './pages/LoginPage';

function HomePage() {
  return (
    <main className="ml-0 lg:ml-[256px] mt-[64px] p-4 sm:p-6 lg:p-8 min-h-screen">
      <div className="max-w-[1200px] mx-auto space-y-6">
        <GenerateButton />
        <ImageUploader />
        <DocButton />
      </div>
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-background-dark font-display text-gray-300">
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                borderRadius: '4px',
                background: '#161616',
                color: '#e5e5e5',
                border: '1px solid rgba(255,255,255,0.1)',
              },
              success: { iconTheme: { primary: '#22c55e', secondary: '#161616' } },
              error: { iconTheme: { primary: '#ea7373', secondary: '#161616' } },
            }}
          />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <SidebarProvider>
                    <Header />
                    <Sidebar />
                  <Routes>
                    <Route path="/" element={<Navigate to="/preview" replace />} />
                    <Route
                      path="/home"
                      element={
                        <RoleGuard>
                          <HomePage />
                        </RoleGuard>
                      }
                    />
                    <Route path="/preview" element={<PreviewPage />} />
                  </Routes>
                  </SidebarProvider>
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
