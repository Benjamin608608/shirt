import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import Navigation from './src/navigation';
import { QualityValidationService } from './src/services/qualityValidation.service';

export default function App() {
  // 初始化品質驗證服務
  useEffect(() => {
    const initializeServices = async () => {
      try {
        await QualityValidationService.initialize();
        console.log('[App] Quality validation service initialized');
      } catch (error) {
        console.warn('[App] Quality validation initialization warning:', error);
        // 繼續運行，服務將降級到僅使用 Edge Function
      }
    };

    initializeServices();
  }, []);

  return (
    <>
      <Navigation />
      <StatusBar style="light" />
    </>
  );
}
