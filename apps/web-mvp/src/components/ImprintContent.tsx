import { useLanguage } from '@/contexts/LanguageContext';
import { IMPRINT } from '@/lib/imprint';

export function ImprintContent() {
  const { t } = useLanguage();

  return (
    <div className="space-y-8 text-base leading-relaxed">
      <div className="space-y-4">
        <p>{t('imprintP1')}</p>
        <p>{t('imprintP2')}</p>
        <p>{t('imprintP3')}</p>
      </div>

      <section aria-labelledby="imprint-legal-heading" className="space-y-4">
        <h2 id="imprint-legal-heading" className="font-display text-xl font-semibold">
          {t('imprintLegalHeading')}
        </h2>
        <dl className="space-y-4">
          <div>
            <dt className="font-medium">{t('imprintResponsible')}</dt>
            <dd>{IMPRINT.responsibleName}</dd>
          </div>
          <div>
            <dt className="font-medium">{t('imprintAddress')}</dt>
            <dd>
              <address className="not-italic">
                {IMPRINT.street}
                <br />
                {IMPRINT.postcodeCity}
                <br />
                {t('imprintCountry')}
              </address>
            </dd>
          </div>
          <div>
            <dt className="font-medium">{t('imprintEmail')}</dt>
            <dd>
              <a
                href={`mailto:${IMPRINT.email}`}
                className="underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-sm"
              >
                {IMPRINT.email}
              </a>
            </dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="imprint-team-heading" className="space-y-4">
        <h2 id="imprint-team-heading" className="font-display text-xl font-semibold">
          {t('imprintTeamHeading')}
        </h2>
        <p>{t('imprintTeam')}</p>
        <p>{IMPRINT.teamNames}</p>
      </section>
    </div>
  );
}
