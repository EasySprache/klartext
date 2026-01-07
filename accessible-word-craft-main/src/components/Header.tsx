import { Settings, Menu } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import AccessibilityPanel from './AccessibilityPanel';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const { t } = useLanguage();

  const navItems = [
    { label: t('home'), href: '#home' },
    { label: t('howItWorks'), href: '#how-it-works' },
    { label: t('whoThisHelps'), href: '#who-this-helps' },
    { label: t('contact'), href: '#contact' },
  ];

  return (
    <>
      <a href="#main-content" className="skip-link">
        {t('skipToContent')}
      </a>
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <a href="#home" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xl">E</span>
              </div>
              <span className="font-display font-bold text-xl text-foreground">EasyLang</span>
            </a>

            <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
              {navItems.map(item => (
                <a
                  key={item.href}
                  href={item.href}
                  className="text-foreground hover:text-secondary font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded px-2 py-1"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <div className="hidden sm:block">
                <LanguageSwitcher />
              </div>
              
              <Button
                variant="outline"
                size="lg"
                onClick={() => setAccessibilityOpen(true)}
                className="hidden sm:flex items-center gap-2"
                aria-label={t('accessibilitySettings')}
              >
                <Settings className="w-5 h-5" aria-hidden="true" />
                <span>{t('accessibility')}</span>
              </Button>

              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                    <Menu className="w-6 h-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72">
                  <nav className="flex flex-col gap-4 mt-8" aria-label="Mobile navigation">
                    {navItems.map(item => (
                      <a
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className="text-lg font-medium text-foreground hover:text-secondary py-2"
                      >
                        {item.label}
                      </a>
                    ))}
                    <div className="mt-4">
                      <LanguageSwitcher />
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setMobileOpen(false);
                        setAccessibilityOpen(true);
                      }}
                      className="mt-4 flex items-center gap-2"
                    >
                      <Settings className="w-5 h-5" />
                      {t('accessibilitySettings')}
                    </Button>
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      <AccessibilityPanel open={accessibilityOpen} onOpenChange={setAccessibilityOpen} />
    </>
  );
}
