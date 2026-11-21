import { AirQualityProvider } from './AirQualityProvider.js';
import { OpenMeteoProvider } from './OpenMeteoProvider.js';
import { DemoAirQualityProvider } from './DemoAirQualityProvider.js';

export class ProviderFactory {
  private static instance: AirQualityProvider | null = null;
  private static currentType: string | null = null;

  public static getProvider(forcedProvider?: string): AirQualityProvider {
    const providerType = (forcedProvider || process.env.AIR_QUALITY_PROVIDER || 'open-meteo').toLowerCase();

    if (this.instance && this.currentType === providerType && !forcedProvider) {
      return this.instance;
    }

    if (providerType === 'demo') {
      const demo = new DemoAirQualityProvider();
      if (!forcedProvider) {
        this.instance = demo;
        this.currentType = 'demo';
      }
      return demo;
    }

    const openMeteo = new OpenMeteoProvider();
    if (!forcedProvider) {
      this.instance = openMeteo;
      this.currentType = 'open-meteo';
    }
    return openMeteo;
  }

  public static resetInstance(): void {
    this.instance = null;
    this.currentType = null;
  }
}
