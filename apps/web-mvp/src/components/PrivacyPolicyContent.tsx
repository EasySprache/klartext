import { useLanguage } from '@/contexts/LanguageContext';

export function PrivacyPolicyContent() {
  const { t } = useLanguage();

  return (
    <div className="space-y-4 text-base leading-relaxed">
      <p>{t('privacyPolicyP1')}</p>
      <p>{t('privacyPolicyP2')}</p>
      <p>{t('privacyPolicyExtension')}</p>
      <p>{t('privacyPolicyExtensionLocal')}</p>
      <p>{t('privacyPolicyP3')}</p>
      <p>{t('privacyPolicyP4')}</p>
      <p>{t('privacyPolicyP5')}</p>
      <p>{t('privacyHttps')}</p>
      <p>{t('privacyLimitedUse')}</p>
      <p>{t('privacyPolicyP6')}</p>
      <p>{t('privacyPolicyP7')}</p>
      <p>{t('privacyPolicyP8')}</p>
    </div>
  );
}
