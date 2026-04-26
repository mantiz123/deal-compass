import { Layout } from "@/components/layout/Layout";
import { DealPackageTracker } from "@/components/tracking/DealPackageTracker";

const Tracking = () => {
  return (
    <Layout>
      {/* Header */}
      <div className="mb-6 sm:mb-8 animate-slide-up">
        <h1 className="text-2xl sm:text-3xl font-bold">Deal Package Tracking</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Monitorea en tiempo real las aperturas, clicks y respuestas de tus deal packages
        </p>
      </div>

      {/* Tracker Component */}
      <DealPackageTracker />
    </Layout>
  );
};

export default Tracking;
