import React, { useState, useEffect } from 'react';
import { InternationalCalculator } from './components/InternationalCalculator';
import { GlobalOpportunityRadar } from './components/GlobalOpportunityRadar';
import { GlobalOpportunity } from './types';
import { useErp } from '../../core/storage/erpStore';

interface InternationalModuleProps {
  initialView?: 'calculadora' | 'radar';
}

export const InternationalModule: React.FC<InternationalModuleProps> = ({ initialView }) => {
  const { activeModuleId } = useErp();

  const getEffectiveView = () => {
    if (initialView) return initialView;
    if (activeModuleId === 'radar-oportunidades' || activeModuleId === 'leads-internacionales') {
      return 'radar';
    }
    return 'calculadora';
  };

  const [view, setView] = useState<'calculadora' | 'radar'>(getEffectiveView());
  const [selectedOpportunityForQuote, setSelectedOpportunityForQuote] = useState<GlobalOpportunity | null>(null);

  useEffect(() => {
    if (initialView) {
      setView(initialView);
    } else if (activeModuleId === 'radar-oportunidades' || activeModuleId === 'leads-internacionales') {
      setView('radar');
    } else if (activeModuleId === 'calculadora-precios') {
      setView('calculadora');
    }
  }, [initialView, activeModuleId]);

  const handleSelectForQuotation = (opp: GlobalOpportunity) => {
    setSelectedOpportunityForQuote(opp);
    setView('calculadora');
  };

  return (
    <div className="w-full">
      {view === 'calculadora' ? (
        <InternationalCalculator initialOpportunity={selectedOpportunityForQuote} />
      ) : (
        <GlobalOpportunityRadar onSelectForQuotation={handleSelectForQuotation} />
      )}
    </div>
  );
};
