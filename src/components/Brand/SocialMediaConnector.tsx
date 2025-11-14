import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  X,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2
} from 'lucide-react';

interface ConnectorProps {
  brandId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface OAuthSettings {
  platform: string;
  client_id: string;
  redirect_uri: string;
  scopes: string[];
  is_active: boolean;
}

const platformInfo = {
  facebook: {
    icon: Facebook,
    color: '#1877F2',
    name: 'Facebook',
    description: 'Connect je Facebook Page voor automatisch posten',
    accountTypes: ['Personal', 'Business', 'Creator']
  },
  instagram: {
    icon: Instagram,
    color: '#E4405F',
    name: 'Instagram',
    description: 'Connect je Instagram Business account',
    accountTypes: ['Personal', 'Business', 'Creator']
  },
  twitter: {
    icon: Twitter,
    color: '#1DA1F2',
    name: 'Twitter/X',
    description: 'Connect je Twitter account',
    accountTypes: ['Free', 'Basic ($100/mo)', 'Pro ($5000/mo)']
  },
  linkedin: {
    icon: Linkedin,
    color: '#0A66C2',
    name: 'LinkedIn',
    description: 'Connect je LinkedIn Company Page',
    accountTypes: ['Personal', 'Company Page', 'Marketing API']
  },
  youtube: {
    icon: Youtube,
    color: '#FF0000',
    name: 'YouTube',
    description: 'Connect je YouTube kanaal',
    accountTypes: ['Personal', 'Brand Account']
  }
};

export function SocialMediaConnector({ brandId, onClose, onSuccess }: ConnectorProps) {
  const [availablePlatforms, setAvailablePlatforms] = useState<OAuthSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);

  useEffect(() => {
    loadOAuthSettings();
  }, []);

  const loadOAuthSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('oauth_settings')
        .select('platform, client_id, redirect_uri, scopes, is_active')
        .eq('is_active', true);

      if (error) throw error;
      setAvailablePlatforms(data || []);
    } catch (error) {
      console.error('Error loading OAuth settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const initiateOAuth = async (platform: string) => {
    setConnectingPlatform(platform);

    try {
      const oauthConfig = availablePlatforms.find(p => p.platform === platform);
      if (!oauthConfig) {
        alert('OAuth niet geconfigureerd voor dit platform');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Je moet ingelogd zijn');
        return;
      }

      const state = btoa(JSON.stringify({
        brandId,
        userId: user.id
      }));

      const scopes = oauthConfig.scopes.join(' ');

      let authUrl = '';

      switch (platform) {
        case 'facebook':
          authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${oauthConfig.client_id}&redirect_uri=${encodeURIComponent(oauthConfig.redirect_uri)}&state=${state}&scope=${encodeURIComponent(scopes)}`;
          break;
        case 'instagram':
          authUrl = `https://api.instagram.com/oauth/authorize?client_id=${oauthConfig.client_id}&redirect_uri=${encodeURIComponent(oauthConfig.redirect_uri)}&state=${state}&scope=${encodeURIComponent(scopes)}&response_type=code`;
          break;
        case 'twitter':
          authUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${oauthConfig.client_id}&redirect_uri=${encodeURIComponent(oauthConfig.redirect_uri)}&state=${state}&scope=${encodeURIComponent(scopes)}&code_challenge=challenge&code_challenge_method=plain`;
          break;
        case 'linkedin':
          authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${oauthConfig.client_id}&redirect_uri=${encodeURIComponent(oauthConfig.redirect_uri)}&state=${state}&scope=${encodeURIComponent(scopes)}`;
          break;
        default:
          alert('Platform nog niet ondersteund');
          return;
      }

      window.location.href = authUrl;
    } catch (error) {
      console.error('Error initiating OAuth:', error);
      alert('Fout bij het starten van OAuth flow');
      setConnectingPlatform(null);
    }
  };

  const connectManually = async (platform: string) => {
    const username = prompt(`Voer je ${platformInfo[platform as keyof typeof platformInfo].name} gebruikersnaam in:`);
    if (!username) return;

    const accountType = prompt(`Account type (bijv: ${platformInfo[platform as keyof typeof platformInfo].accountTypes.join(', ')}):`);
    const notes = prompt('Extra notities (optioneel, bijv: API tier, limits):');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('social_media_accounts')
        .insert({
          brand_id: brandId,
          platform,
          platform_user_id: username,
          platform_username: username,
          platform_account_type: accountType || null,
          account_notes: notes || null,
          is_active: true
        });

      if (error) throw error;

      alert('Account succesvol toegevoegd!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error adding account:', error);
      alert('Fout bij toevoegen account');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center">
            <Loader2 className="animate-spin text-orange-600" size={32} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Social Media Account Koppelen</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {availablePlatforms.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertCircle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-800">
                  Geen OAuth configuratie gevonden. Neem contact op met je operator om social media integraties in te stellen.
                </p>
                <p className="text-sm text-yellow-800 mt-2">
                  Je kunt voorlopig accounts handmatig toevoegen voor tracking doeleinden.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(platformInfo).map(([platform, info]) => {
            const Icon = info.icon;
            const hasOAuth = availablePlatforms.some(p => p.platform === platform);
            const isConnecting = connectingPlatform === platform;

            return (
              <div
                key={platform}
                className="border-2 border-gray-200 rounded-lg p-4 hover:border-orange-300 transition-colors"
              >
                <div className="flex items-center space-x-3 mb-3">
                  <Icon size={32} style={{ color: info.color }} />
                  <div>
                    <h3 className="font-semibold">{info.name}</h3>
                    {hasOAuth && (
                      <span className="text-xs text-green-600 flex items-center space-x-1">
                        <CheckCircle2 size={12} />
                        <span>OAuth actief</span>
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-4">{info.description}</p>

                <div className="space-y-2">
                  {hasOAuth && (
                    <button
                      onClick={() => initiateOAuth(platform)}
                      disabled={isConnecting}
                      className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Verbinden...</span>
                        </>
                      ) : (
                        <>
                          <ExternalLink size={16} />
                          <span>Connect met OAuth</span>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => connectManually(platform)}
                    className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Handmatig Toevoegen
                  </button>
                </div>

                <div className="mt-3 text-xs text-gray-500">
                  <p className="font-medium mb-1">Account types:</p>
                  <p>{info.accountTypes.join(' • ')}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-2">Hoe werkt het?</p>
              <ul className="space-y-1 ml-4">
                <li>• <strong>OAuth:</strong> Automatische koppeling met volledige API toegang</li>
                <li>• <strong>Handmatig:</strong> Voor tracking doeleinden, geen automatisch posten</li>
                <li>• <strong>API Costs:</strong> Je betaalt direct aan het platform (Facebook, Twitter, etc.)</li>
                <li>• <strong>Business Accounts:</strong> Sommige platforms vereisen een business/creator account</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
