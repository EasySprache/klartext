import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import TranslationSection from '@/components/TranslationSection';
import HowItWorksSection from '@/components/HowItWorksSection';
import WhoThisHelpsSection from '@/components/WhoThisHelpsSection';
import Footer from '@/components/Footer';

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main id="main-content">
        <HeroSection />
        <TranslationSection />
        <HowItWorksSection />
        <WhoThisHelpsSection />
      </main>
      <Footer />
    </div>
  );
}
