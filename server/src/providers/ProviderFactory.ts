import { AirQualityProvider } from './AirQualityProvider.js';
import { OpenMeteoProvider } from './OpenMeteoProvider.js';
import { DemoAirQualityProvider } from './DemoAirQualityProvider.js';

export class ProviderFactory {
  private static instance: AirQualityProvider | null = null;

  public static getProvider(forcedProvider?: string): AirQualityProvider {
    if (this.instance && !forcedProvider) {
      return this.instance;
    }

    const providerType = forcedProvider || process.env.AIR_QUALITY_PROVIDER || 'open-meteo';

    if (providerType.toLowerCase() === 'demo') {
      const demo = new DemoAirQualityProvider();
      if (!forcedProvider) this.instance = demo;
      return demo;
    }

    const openMeteo = new OpenMeteoProvider();
    if (!forcedProvider) this.instance = openMeteo;
    return openMeteo;
  }

  public static resetInstance(): void {
    this.instance = null;
  }
}
