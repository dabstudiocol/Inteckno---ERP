import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Plus,
  Users,
  TrendingUp,
  MessageCircle,
  Building2,
  DollarSign,
  Calendar,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Search,
  Filter,
  Sparkles,
  FileText,
  AlertCircle,
  Pencil,
  Maximize2,
  Tag,
  Settings,
  GripVertical,
  X,
  Phone,
  Mail,
  Clock,
  RefreshCw,
  Send,
  Trash2,
  Printer,
  Check,
  Copy,
  AlertTriangle,
  ShieldCheck,
  FileSpreadsheet,
  Loader2,
  UserPlus,
  Layers,
  History,
  Target,
  FileCheck,
  Globe,
  HandCoins,
  SlidersHorizontal,
  RotateCcw,
  HelpCircle,
  Info,
  MessageSquare,
  ArrowRightLeft,
} from 'lucide-react';
import { useErp } from '../../core/storage/erpStore';
import {
  Opportunity,
  OpportunityStage,
  CRMContact,
  OpportunityActivity,
  OpportunityQuotation,
  OpportunityQuotationItem,
  OpportunityPliegoAnalysis,
  OpportunityStakeholder,
  Project,
} from '../../types';
import { ContactDetailModal } from './ContactDetailModal';
import { AwardOpportunityModal } from './components/AwardOpportunityModal';
import { UniversalModuleConfigModal } from '../../components/common/UniversalModuleConfigModal';
import { ConfirmDeleteModal } from '../../components/common/ConfirmDeleteModal';
import { useModuleCatalog } from '../../core/services/moduleConfigService';
import { CreatableSelect } from '../../components/common/CreatableSelect';
import { getStoredTRM, convertUSDToCOP, formatCOP, formatUSD } from '../../core/services/trmService';
import {
  calculateDealScore,
  generateCommercialProposalDraft,
  analyzeBiddingPliego,
  getDealScoreSettings,
  saveDealScoreSettings,
  resetDealScoreSettings,
  DealScoreSettings,
} from '../../core/services/lucianaService';
import { openOutlookWebCompose } from '../../core/services/m365Sync';
import {
  fetchLiveTRM,
  analyzeCustomsAndLogisticsWithLuciana,
} from '../../core/services/geminiChatService';

export function getOppFinancialBreakdown(opp: Opportunity, currentTrm: number) {
  const trm = currentTrm > 0 ? currentTrm : 4150;
  const rawCurr = opp.currency;
  const isCop = rawCurr === 'COP' || (!rawCurr && (opp.estimatedValueUSD > 2000000 || (opp.estimatedValue && opp.estimatedValue > 2000000)));

  if (isCop) {
    const copVal = opp.estimatedValue || opp.estimatedValueUSD || 0;
    const usdVal = Math.round(copVal / trm);
    return {
      primary: formatCOP(copVal),
      secondary: formatUSD(usdVal),
      copVal,
      usdVal,
      currency: 'COP',
      isCop: true,
    };
  } else {
    const usdVal = opp.estimatedValueUSD || opp.estimatedValue || 0;
    const copVal = convertUSDToCOP(usdVal, trm);
    return {
      primary: formatCOP(copVal),
      secondary: formatUSD(usdVal),
      copVal,
      usdVal,
      currency: rawCurr || 'USD',
      isCop: false,
    };
  }
}

function printQuotationPdf(opp: Opportunity, quote: OpportunityQuotation) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const isExport = quote.operationType === 'exportacion';
  const isImport = quote.operationType === 'importacion';
  const opLabel = isExport
    ? 'EXPORTACIÓN DE SERVICIOS / BIENES DE TRANSPORTE POR CABLE'
    : isImport
    ? 'IMPORTACIÓN Y SUMINISTRO DE COMPONENTES OEM STC'
    : 'VENTA NACIONAL (COLOMBIA) - INGENIERÍA Y SERVICIOS STC';

  const itemsRows = (quote.items || [])
    .map(
      (it, idx) => `
    <tr>
      <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 11px;">${idx + 1}</td>
      <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-size: 10px; color: #00668F; font-weight: 700;">${it.category || 'Servicio STC'}</td>
      <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: 500;">${it.description}</td>
      <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 11px;">${it.qty}</td>
      <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 11px;">$${Number(it.unitPrice).toLocaleString()} ${it.currency || quote.currency}</td>
      <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; font-size: 11px;">$${(Number(it.qty) * Number(it.unitPrice)).toLocaleString()} ${it.currency || quote.currency}</td>
    </tr>
  `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Cotización Oficial Inteckno - ${quote.code}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');
          * { box-sizing: border-box; font-family: 'Montserrat', sans-serif; }
          body { color: #1e293b; margin: 0; padding: 36px; background: #fff; line-height: 1.4; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #00668F; padding-bottom: 16px; margin-bottom: 20px; }
          .company-title { font-size: 24px; font-weight: 800; color: #00668F; letter-spacing: -0.5px; }
          .company-sub { font-size: 10px; color: #64748b; margin-top: 4px; }
          .quote-badge { text-align: right; }
          .quote-code { font-size: 16px; font-weight: 800; color: #0f172a; }
          .quote-date { font-size: 11px; color: #64748b; margin-top: 2px; }
          .op-banner { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 8px 14px; font-size: 10.5px; font-weight: 700; color: #166534; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.5px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px; font-size: 11px; }
          .info-block strong { color: #00668F; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #00668F; color: white; padding: 10px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
          .totals-table { width: 360px; margin-left: auto; border-collapse: collapse; margin-bottom: 24px; }
          .totals-table td { padding: 6px 12px; font-size: 11px; border-bottom: 1px solid #f1f5f9; }
          .total-row { background: #00668F; color: white; font-weight: 800; font-size: 13px !important; }
          .total-row td { border-bottom: none; }
          .terms { background: #f1f5f9; border-left: 4px solid #00668F; padding: 14px; border-radius: 8px; font-size: 10px; color: #334155; margin-bottom: 30px; }
          .terms strong { color: #0f172a; }
          .signature { display: flex; justify-content: space-between; margin-top: 36px; }
          .sign-box { width: 250px; border-top: 1px solid #94a3b8; padding-top: 8px; text-align: center; font-size: 10px; color: #475569; }
          @media print { body { padding: 12px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="company-title">INTECKNO S.A.S.</div>
            <div class="company-sub">
              NIT: 901.345.678-9 | Especialistas en Sistemas de Transporte por Cable Aéreo (STC)<br />
              Medellín, Antioquia, Colombia • comercial@inteckno.com • www.inteckno.com
            </div>
          </div>
          <div class="quote-badge">
            <div class="quote-code">${quote.code}</div>
            <div class="quote-date">Fecha de Emisión: ${quote.createdAt || new Date().toISOString().split('T')[0]}</div>
            <div class="quote-date">Vigencia de Oferta: ${quote.validUntil || '30 días calendario'}</div>
          </div>
        </div>

        <div class="op-banner">
          Modalidad: ${opLabel}
        </div>

        <div class="info-grid">
          <div class="info-block">
            <strong>DATOS DEL CLIENTE / OPERADOR:</strong><br />
            Razón Social: ${opp.clientName}<br />
            Atención: ${opp.clientContactPerson || 'Dirección de Operaciones & Mantenimiento'}<br />
            País / Ciudad: ${opp.country} ${quote.destinationCity ? `(${quote.destinationCity})` : ''}<br />
            ${opp.clientEmail ? `Correo: ${opp.clientEmail}<br />` : ''}
            ${opp.clientPhone ? `Teléfono: ${opp.clientPhone}` : ''}
          </div>
          <div class="info-block">
            <strong>DETALLES COMERCIALES DE LA OFERTA:</strong><br />
            Proyecto: ${opp.title} (${opp.code})<br />
            Sistema / Cable STC: ${opp.cableType || 'Transporte por Cable Aéreo'}<br />
            Moneda Oficial: ${quote.currency || 'USD'}<br />
            Términos de Entrega / Incoterm: ${quote.incoterm || (isExport ? 'DDP En Sitio de Operación' : 'Entrega en Instalaciones del Cliente')}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 35px; text-align: center;">#</th>
              <th style="width: 110px; text-align: left;">Categoría</th>
              <th style="text-align: left;">Descripción del Servicio Técnico / Repuestos OEM</th>
              <th style="width: 50px; text-align: center;">Cant.</th>
              <th style="width: 120px; text-align: right;">Precio Unit.</th>
              <th style="width: 130px; text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows || '<tr><td colspan="6" style="text-align:center; padding: 12px;">Sin ítems registrados</td></tr>'}
          </tbody>
        </table>

        <table class="totals-table">
          <tr>
            <td>Subtotal Ítems:</td>
            <td style="text-align: right; font-weight: 600;">$${Number(quote.subtotal || 0).toLocaleString()} ${quote.currency}</td>
          </tr>
          ${
            quote.discountAmount && quote.discountAmount > 0
              ? `<tr>
                  <td style="color: #047857;">Descuento Comercial (${quote.discountPercent || 0}%):</td>
                  <td style="text-align: right; font-weight: 600; color: #047857;">-$${Number(quote.discountAmount).toLocaleString()} ${quote.currency}</td>
                </tr>`
              : ''
          }
          ${
            quote.paymentTermSurchargeAmount && quote.paymentTermSurchargeAmount !== 0
              ? `<tr>
                  <td style="${quote.paymentTermSurchargeAmount < 0 ? 'color: #047857;' : 'color: #b45309;'}">
                    ${quote.paymentTermSurchargeAmount < 0 ? 'Descuento Financiero Pronto Pago' : 'Costo Financiero de Capital (Términos de Pago)'} (${quote.paymentTermSurchargePercent || 0}%):
                  </td>
                  <td style="text-align: right; font-weight: 600; ${quote.paymentTermSurchargeAmount < 0 ? 'color: #047857;' : 'color: #b45309;'}">
                    ${quote.paymentTermSurchargeAmount < 0 ? '-' : '+'}$${Math.abs(Number(quote.paymentTermSurchargeAmount)).toLocaleString()} ${quote.currency}
                  </td>
                </tr>`
              : ''
          }
          ${
            quote.logisticsCost && quote.logisticsCost > 0
              ? `<tr>
                  <td>Gastos de Logística / Viáticos de Campo (${quote.incoterm || 'DDP'}):</td>
                  <td style="text-align: right; font-weight: 600;">+$${Number(quote.logisticsCost).toLocaleString()} ${quote.currency}</td>
                </tr>`
              : ''
          }
          ${
            isImport && quote.customsDutyAmount && quote.customsDutyAmount > 0
              ? `<tr>
                  <td>Aranceles Aduaneros DIAN (${((quote.customsDutyRate || 0.05) * 100).toFixed(0)}%):</td>
                  <td style="text-align: right; font-weight: 600;">+$${Number(quote.customsDutyAmount).toLocaleString()} ${quote.currency}</td>
                </tr>`
              : ''
          }
          ${
            isImport && quote.importFees && quote.importFees > 0
              ? `<tr>
                  <td>Gastos Portuarios & Intermediación SIA:</td>
                  <td style="text-align: right; font-weight: 600;">+$${Number(quote.importFees).toLocaleString()} ${quote.currency}</td>
                </tr>`
              : ''
          }
          <tr>
            <td>IVA (${isExport ? '0% Exportación (E.T. Art. 481)' : `${((quote.taxRate || 0) * 100).toFixed(0)}%`}):</td>
            <td style="text-align: right; font-weight: 600;">$${Number(quote.taxAmount || 0).toLocaleString()} ${quote.currency}</td>
          </tr>
          <tr class="total-row">
            <td>VALOR TOTAL PROPUESTA:</td>
            <td style="text-align: right;">$${Number(quote.total || 0).toLocaleString()} ${quote.currency}</td>
          </tr>
          ${
            quote.currency !== 'COP' && quote.exchangeRateTRM
              ? `<tr style="color: #64748b; font-size: 11px;">
                  <td>Equivalente en Pesos Colombianos (TRM $${Number(quote.exchangeRateTRM).toLocaleString('es-CO')}):</td>
                  <td style="text-align: right; font-weight: 700; color: #00668F;">$${Math.round(quote.total * quote.exchangeRateTRM).toLocaleString('es-CO')} COP</td>
                </tr>`
              : ''
          }
          ${
            quote.applyReteFuente && quote.reteFuenteAmount && quote.reteFuenteAmount > 0
              ? `<tr style="color: #64748b; font-size: 10px;">
                  <td>(-) ReteFuente Proyectada (${((quote.reteFuenteRate || 0.04) * 100).toFixed(1)}%):</td>
                  <td style="text-align: right;">-$${Number(quote.reteFuenteAmount).toLocaleString()} ${quote.currency}</td>
                </tr>`
              : ''
          }
          ${
            quote.applyReteIca && quote.reteIcaAmount && quote.reteIcaAmount > 0
              ? `<tr style="color: #64748b; font-size: 10px;">
                  <td>(-) ReteICA Proyectado (${((quote.reteIcaRate || 0.00966) * 1000).toFixed(2)}‰):</td>
                  <td style="text-align: right;">-$${Number(quote.reteIcaAmount).toLocaleString()} ${quote.currency}</td>
                </tr>`
              : ''
          }
          ${
            quote.netReceivable && quote.netReceivable > 0 && (quote.applyReteFuente || quote.applyReteIca)
              ? `<tr style="font-weight: 700; color: #00668F; background: #f0f9ff;">
                  <td>NETO ESTIMADO A PERCIBIR:</td>
                  <td style="text-align: right;">$${Number(quote.netReceivable).toLocaleString()} ${quote.currency}</td>
                </tr>`
              : ''
          }
        </table>

        <div class="terms">
          <strong>CONDICIONES COMERCIALES, NORMATIVAS Y DE GARANTÍA INTECKNO S.A.S.:</strong><br />
          • Validez de la oferta: ${quote.validUntil || '30 días calendario a partir de su emisión'}.<br />
          • Condiciones de pago: ${quote.paymentTerms || '50% anticipo al ordenar, 50% contra entrega de informe técnico avalado'}.<br />
          • Términos de entrega / Incoterm: ${quote.incoterm || (isExport ? 'DDP En Sitio de Operación' : 'Entrega en Instalaciones')} en ${quote.destinationCity || opp.country}.<br />
          ${quote.customsSubheading ? `• Subpartida Arancelaria DIAN: ${quote.customsSubheading} (Decreto 1881 / Régimen Aduanero).<br />` : ''}
          • Cumplimiento Normativo: Protocolos de inspección técnica según normativas europeas EN 12927 (cables de transporte), ISO 4309 y recomendaciones de fabricante (Doppelmayr / Poma / Leitner).<br />
          • Calificación del Personal: Inspectores certificados en Ensayos No Destructivos (NDT Nivel II) y técnicos avalados en trabajo seguro en alturas.<br />
          • Garantía Técnica: ${quote.warranty || '12 meses sobre mano de obra calificada e informes de ingeniería avalados'}.<br />
          ${
            isExport
              ? '• Régimen Tributario Internacional: Operación calificada como Exportación de Servicios exenta de IVA de conformidad con el Artículo 481 literal c del Estatuto Tributario colombiano (E.T.).<br />'
              : ''
          }
        </div>

        <div class="signature">
          <div class="sign-box">
            <strong>${opp.assignedOwnerName || 'Dirección Comercial & Proyectos'}</strong><br />
            Equipo Comercial & Ingeniería STC<br />
            INTECKNO S.A.S. • NIT 901.345.678-9
          </div>
          <div class="sign-box">
            <strong>Aceptación del Cliente</strong><br />
            Firma Autorizada y Sello de la Empresa<br />
            ${opp.clientName}
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 400);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

interface CrmModuleProps {
  activeTab?: 'pipeline' | 'contactos' | 'ventas' | 'whatsapp';
}

export const CrmModule: React.FC<CrmModuleProps> = ({ activeTab: propActiveTab }) => {
  const {
    opportunities,
    contacts,
    partners,
    createOpportunity,
    updateOpportunity,
    deleteOpportunity,
    awardOpportunity,
    createContact,
    updateContact,
    deleteContact,
    currentUser,
    users,
    activeModuleId,
    setActiveModule,
    notify,
    createCalendarEvent,
  } = useErp();

  // Si se pasa activeTab por prop o se deduce del activeModuleId del ERP
  const derivedTab = propActiveTab || (activeModuleId === 'contactos' ? 'contactos' : activeModuleId === 'ventas' ? 'ventas' : activeModuleId === 'whatsapp' ? 'whatsapp' : 'pipeline');
  const [internalTab, setInternalTab] = useState<'pipeline' | 'contactos' | 'ventas' | 'whatsapp'>(derivedTab);

  // Mantener sincronizado cuando cambie activeModuleId o propActiveTab
  React.useEffect(() => {
    if (propActiveTab) {
      setInternalTab(propActiveTab);
    } else if (activeModuleId === 'contactos' || activeModuleId === 'ventas' || activeModuleId === 'whatsapp' || activeModuleId === 'crm') {
      setInternalTab(activeModuleId === 'crm' ? 'pipeline' : activeModuleId);
    }
  }, [propActiveTab, activeModuleId]);

  const activeTab = internalTab;
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTrm, setCurrentTrm] = useState<number>(() => getStoredTRM());

  useEffect(() => {
    const handleTrmUpdate = (e: any) => {
      if (e.detail?.rate) setCurrentTrm(e.detail.rate);
    };
    window.addEventListener('inteckno_trm_updated', handleTrmUpdate);
    return () => window.removeEventListener('inteckno_trm_updated', handleTrmUpdate);
  }, []);

  const [isNewOppModalOpen, setIsNewOppModalOpen] = useState(false);
  const [isNewContactModalOpen, setIsNewContactModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [selectedOppForAward, setSelectedOppForAward] = useState<Opportunity | null>(null);
  const [oppPreviousStage, setOppPreviousStage] = useState<OpportunityStage | null>(null);
  const [editingOpp, setEditingOpp] = useState<Opportunity | null>(null);
  const [editingContact, setEditingContact] = useState<CRMContact | null>(null);
  const [oppToDelete, setOppToDelete] = useState<Opportunity | null>(null);
  const [contactToDelete, setContactToDelete] = useState<CRMContact | null>(null);

  // Pestaña activa del Modal de Detalle / Consola de la Oportunidad
  const [oppModalTab, setOppModalTab] = useState<
    'general' | 'bitacora' | 'cotizador' | 'pliegos' | 'stakeholders' | 'propuesta'
  >('general');

  // Estados para Agendar Reunión Comercial (Calendario & Teams)
  const [isScheduleMeetingModalOpen, setIsScheduleMeetingModalOpen] = useState(false);
  const [selectedOppForMeeting, setSelectedOppForMeeting] = useState<Opportunity | null>(null);
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    time: '10:00 AM - 11:00 AM',
    meetingMethod: 'virtual' as 'virtual' | 'presencial',
    attendees: '',
    location: '',
    description: '',
  });

  // Estados para Registro Rápido de Llamada Comercial
  const [isQuickCallModalOpen, setIsQuickCallModalOpen] = useState(false);
  const [selectedOppForCall, setSelectedOppForCall] = useState<Opportunity | null>(null);
  const [callNotes, setCallNotes] = useState('');

  // Estados para Bitácora dentro de editingOpp
  const [newActivityForm, setNewActivityForm] = useState<{
    type: OpportunityActivity['type'];
    description: string;
  }>({
    type: 'call',
    description: '',
  });

  // Estados para Cotizador Técnico dentro de editingOpp
  const [activeQuotationIndex, setActiveQuotationIndex] = useState(0);
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemPrice, setNewItemPrice] = useState(15000);
  const [newItemCurrency, setNewItemCurrency] = useState<'USD' | 'COP'>('USD');
  const [newItemCategory, setNewItemCategory] = useState<string>('Servicio STC');
  const [isFetchingTRM, setIsFetchingTRM] = useState(false);
  const [isAnalyzingCustoms, setIsAnalyzingCustoms] = useState(false);

  // Estados para Análisis de Pliegos con LUC-IA-NA
  const [isAnalyzingPliego, setIsAnalyzingPliego] = useState(false);
  const [pliegoInputText, setPliegoInputText] = useState('');
  const [pliegoFileName, setPliegoFileName] = useState('Pliego_Licitacion_SECOP_STC.pdf');

  // Estados para Generador de Propuesta Comercial
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false);
  const [proposalSubject, setProposalSubject] = useState('');
  const [proposalBody, setProposalBody] = useState('');
  const [proposalCopied, setProposalCopied] = useState(false);

  // Estados para Stakeholders
  const [selectedContactIdForStakeholder, setSelectedContactIdForStakeholder] = useState('');
  const [stakeholderRole, setStakeholderRole] = useState('Decisor');
  const [stakeholderNotes, setStakeholderNotes] = useState('');

  // Estados para Configuración Personalizada de Deal Score (Probabilidad de Cierre)
  const [dealScoreSettings, setDealScoreSettings] = useState<DealScoreSettings>(getDealScoreSettings());
  const [isConfiguringDealScore, setIsConfiguringDealScore] = useState(false);
  const [showDealScoreExplainer, setShowDealScoreExplainer] = useState(false);

  // Abrir consola de oportunidad garantizando Deal Score y estructura
  const handleSelectOppToEdit = (opp: Opportunity) => {
    let currentScore = opp.aiDealScore;
    let currentDetails = opp.aiDealScoreDetails;
    let currentFactors = opp.aiDealScoreFactors;
    if (!currentScore) {
      const calculated = calculateDealScore(opp, dealScoreSettings);
      currentScore = calculated.score;
      currentDetails = calculated.details;
      currentFactors = calculated.factors;
    }

    let quotations = opp.quotations;
    const isCo = (opp.country || '').toLowerCase().includes('colombia');
    const quoteCurrency: 'COP' | 'USD' | 'EUR' = opp.currency || (isCo ? 'COP' : 'USD');
    const trm = currentTrm > 0 ? currentTrm : 4150;

    if (!quotations || quotations.length === 0) {
      const opType = isCo ? 'nacional' : 'exportacion';
      const isQuoteCop = quoteCurrency === 'COP';
      const fin = getOppFinancialBreakdown(opp, trm);
      
      const item1Price = isQuoteCop ? Math.round(fin.copVal * 0.8) : (opp.estimatedValueUSD || 45000);
      const item2Price = isQuoteCop ? Math.round(fin.copVal * 0.2) : 5000;
      const subtotal = item1Price + item2Price;
      const taxRate = isCo ? 0.19 : 0;
      const taxAmount = subtotal * taxRate;
      const total = subtotal + taxAmount;
      const reteFuenteAmount = isCo ? subtotal * 0.04 : 0;
      const reteIcaAmount = isCo ? subtotal * 0.00966 : 0;
      const netReceivable = isCo ? total - (reteFuenteAmount + reteIcaAmount) : total;

      quotations = [
        {
          id: `COT-${Date.now()}`,
          code: `COT-${opp.code || 'STC'}-01`,
          title: `Cotización Base: ${opp.title}`,
          operationType: opType,
          items: [
            {
              id: `ITEM-1`,
              category: 'Servicio STC',
              description: `Servicio integral de mantenimiento e inspección técnica especializada para ${opp.cableType || 'sistema de teleférico'}`,
              qty: 1,
              unitPrice: item1Price,
              currency: quoteCurrency,
            },
            {
              id: `ITEM-2`,
              category: 'Ensayos NDT/MRT',
              description: 'Ensayos no destructivos (NDT Nivel II) y reporte técnico avalado con firmas de ingeniería',
              qty: 1,
              unitPrice: item2Price,
              currency: quoteCurrency,
            },
          ],
          subtotal,
          discountPercent: 0,
          discountAmount: 0,
          logisticsCost: 0,
          taxRate,
          taxAmount,
          applyReteFuente: isCo,
          reteFuenteRate: 0.04,
          reteFuenteAmount,
          applyReteIca: isCo,
          reteIcaRate: 0.00966,
          reteIcaAmount,
          total,
          netReceivable,
          validUntil: opp.expectedCloseDate || '30 días calendario',
          paymentTerms: '50% anticipo al ordenar, 50% contra entrega de informe técnico avalado',
          createdAt: new Date().toISOString().split('T')[0],
          incoterm: isCo ? 'Entrega en Instalaciones' : 'DDP En Sitio de Operación',
          currency: quoteCurrency,
          exchangeRateTRM: trm,
          warranty: '12 meses sobre mano de obra especializada e integridad de diagnósticos NDT',
          notes: isCo
            ? 'Precios en COP para operación en territorio nacional.'
            : 'Precios en USD para exportación de servicios exentos de IVA (Art. 481 literal c E.T.).',
        },
      ];
    } else {
      // Saneamiento de cotizaciones existentes con TRM obsoleta (< 3800)
      quotations = quotations.map((q) => ({
        ...q,
        exchangeRateTRM: (q.exchangeRateTRM && q.exchangeRateTRM >= 3800) ? q.exchangeRateTRM : trm,
      }));
    }

    setEditingOpp({
      ...opp,
      aiDealScore: currentScore,
      aiDealScoreDetails: currentDetails,
      aiDealScoreFactors: currentFactors,
      quotations,
    });
    setOppModalTab('general');
    setIsConfiguringDealScore(false);
    setShowDealScoreExplainer(false);
    setActiveQuotationIndex(0);
    setProposalSubject(`Propuesta Técnico-Económica Inteckno S.A.S. - [${opp.code}] ${opp.title}`);
    setProposalBody('');
  };

  // Abrir modal de agendar reunión
  const handleOpenMeetingModal = (opp: Opportunity) => {
    setSelectedOppForMeeting(opp);
    setMeetingForm({
      title: `Reunión de Alineación Comercial: ${opp.code} - ${opp.title}`,
      date: new Date().toISOString().split('T')[0],
      time: '10:00 AM - 11:00 AM',
      meetingMethod: 'virtual',
      attendees: `${currentUser.name}, ${opp.clientContactPerson || opp.clientName}`,
      location: 'Microsoft Teams (Reunión Virtual)',
      description: `Sesión de trabajo comercial y técnica con ${opp.clientName} sobre el sistema ${opp.cableType}.`,
    });
    setIsScheduleMeetingModalOpen(true);
  };

  // Guardar reunión en el Calendario oficial de Inteckno y en la bitácora
  const handleSaveMeeting = () => {
    if (!selectedOppForMeeting) return;
    const opp = selectedOppForMeeting;
    const nowIso = new Date().toISOString();
    const startTime = meetingForm.time.split('-')[0]?.trim() || '10:00 AM';
    const endTime = meetingForm.time.split('-')[1]?.trim() || '11:00 AM';

    createCalendarEvent({
      title: meetingForm.title,
      date: meetingForm.date,
      time: meetingForm.time,
      startTime,
      endTime,
      type: 'visita_campo',
      location: meetingForm.meetingMethod === 'virtual' ? 'Microsoft Teams' : meetingForm.location || opp.country,
      meetingMethod: meetingForm.meetingMethod,
      teamsMeetingUrl:
        meetingForm.meetingMethod === 'virtual'
          ? `https://teams.microsoft.com/l/meetup-join/inteckno-${Date.now()}`
          : undefined,
      attendees: meetingForm.attendees.split(',').map((a) => a.trim()).filter(Boolean),
      projectCode: opp.code,
      projectName: opp.title,
      description: meetingForm.description,
    });

    const newAct: OpportunityActivity = {
      id: `ACT-${Date.now()}`,
      type: 'meeting',
      description: `Reunión agendada para el ${meetingForm.date} (${meetingForm.time}): ${meetingForm.title}`,
      authorName: currentUser.name,
      timestamp: nowIso,
    };

    const updatedLog = [newAct, ...(opp.activityLog || [])];
    updateOpportunity(opp.id, {
      activityLog: updatedLog,
      lastActivityAt: nowIso,
    });

    if (editingOpp && editingOpp.id === opp.id) {
      setEditingOpp((prev) =>
        prev ? { ...prev, activityLog: updatedLog, lastActivityAt: nowIso } : null
      );
    }

    notify?.('success', 'Reunión Agendada', `Se integró la reunión al Calendario de Inteckno para ${opp.title}.`);
    setIsScheduleMeetingModalOpen(false);
    setSelectedOppForMeeting(null);
  };

  // Acción rápida para registrar llamada telefónica
  const handleQuickCall = (opp: Opportunity) => {
    setSelectedOppForCall(opp);
    setCallNotes('');
    setIsQuickCallModalOpen(true);
  };

  const handleSaveQuickCall = () => {
    if (!selectedOppForCall) return;
    const opp = selectedOppForCall;
    const nowIso = new Date().toISOString();
    const newAct: OpportunityActivity = {
      id: `ACT-${Date.now()}`,
      type: 'call',
      description: callNotes
        ? `Llamada telefónica: ${callNotes}`
        : 'Llamada telefónica de seguimiento comercial realizada con el cliente.',
      authorName: currentUser.name,
      timestamp: nowIso,
    };
    const updatedLog = [newAct, ...(opp.activityLog || [])];
    updateOpportunity(opp.id, {
      activityLog: updatedLog,
      lastActivityAt: nowIso,
    });

    if (editingOpp && editingOpp.id === opp.id) {
      setEditingOpp((prev) =>
        prev ? { ...prev, activityLog: updatedLog, lastActivityAt: nowIso } : null
      );
    }

    notify?.('success', 'Llamada Registrada', `Se añadió la gestión a la bitácora de ${opp.title}.`);
    setIsQuickCallModalOpen(false);
    setSelectedOppForCall(null);
  };

  // Enviar correo de seguimiento oficial vía Outlook Web
  const handleQuickOutlookEmail = (opp: Opportunity) => {
    const to = opp.clientEmail || '';
    const subject = `[${opp.code}] Seguimiento Comercial: ${opp.title} - Inteckno S.A.S.`;
    const body = `Estimado(a) ${opp.clientContactPerson || opp.clientName},\n\nEs un placer saludarle desde INTECKNO S.A.S. Nos ponemos en contacto para hacer seguimiento a la oportunidad "${opp.title}" relacionada con el sistema ${opp.cableType}.\n\nQuedamos a su entera disposición para cualquier aclaración técnica o reunión de avance.\n\nCordialmente,\n\n${currentUser.name}\n${currentUser.roleLabel || 'Ingeniería Comercial STC'}\nINTECKNO S.A.S.\nMedellín, Colombia`;

    openOutlookWebCompose(to, subject, body);

    const nowIso = new Date().toISOString();
    const newAct: OpportunityActivity = {
      id: `ACT-${Date.now()}`,
      type: 'email',
      description: `Correo electrónico preparado y abierto en Outlook Web para ${to || opp.clientName}.`,
      authorName: currentUser.name,
      timestamp: nowIso,
    };
    const updatedLog = [newAct, ...(opp.activityLog || [])];
    updateOpportunity(opp.id, {
      activityLog: updatedLog,
      lastActivityAt: nowIso,
    });

    if (editingOpp && editingOpp.id === opp.id) {
      setEditingOpp((prev) =>
        prev ? { ...prev, activityLog: updatedLog, lastActivityAt: nowIso } : null
      );
    }
  };

  // Catálogos dinámicos editables por Inteckno
  const catalogCableTypes = useModuleCatalog('crm', 'cableTypes');
  const catalogLeadSources = useModuleCatalog('crm', 'leadSources');
  const catalogCountries = useModuleCatalog('crm', 'countries');

  // Formulario Nueva Oportunidad
  const [oppForm, setOppForm] = useState({
    title: '',
    clientName: '',
    clientContactPerson: '',
    clientEmail: '',
    clientPhone: '',
    cableType: 'Aéreo Monocable Desembragable 10-MGD',
    country: 'Colombia',
    currency: 'COP' as 'COP' | 'USD' | 'EUR',
    estimatedValue: 48500000,
    estimatedValueUSD: 11687,
    stage: 'qualification' as OpportunityStage,
    expectedCloseDate: '2026-11-30',
    technicalSpecs: '',
    leadSource: 'Licitación Pública (SECOP II / Mercado Público)',
    tags: [] as string[],
  });

  // Estados interactivos de Drag and Drop para el Pipeline Kanban
  const [draggedOppId, setDraggedOppId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<OpportunityStage | null>(null);

  // Estados interactivos para gestión de etiquetas
  const [newEditTagInput, setNewEditTagInput] = useState('');
  const [newOppTagInput, setNewOppTagInput] = useState('');

  const SUGGESTED_TAGS = [
    'Licitación Pública',
    'Urgente',
    'Mantenimiento Mayor STC',
    'Suministro Repuestos',
    'Cliente Preferencial',
    'Ensayos No Destructivos (END)',
    'Internacional LATAM',
  ];

  const handleAddTagToEditingOpp = (tagToAdd?: string) => {
    const tag = (tagToAdd || newEditTagInput).trim();
    if (!tag || !editingOpp) return;
    const currentTags = editingOpp.tags || [];
    if (!currentTags.includes(tag)) {
      setEditingOpp({
        ...editingOpp,
        tags: [...currentTags, tag],
      });
    }
    setNewEditTagInput('');
  };

  const handleRemoveTagFromEditingOpp = (tagToRemove: string) => {
    if (!editingOpp) return;
    setEditingOpp({
      ...editingOpp,
      tags: (editingOpp.tags || []).filter((t) => t !== tagToRemove),
    });
  };

  const handleAddTagToNewOpp = (tagToAdd?: string) => {
    const tag = (tagToAdd || newOppTagInput).trim();
    if (!tag) return;
    const currentTags = oppForm.tags || [];
    if (!currentTags.includes(tag)) {
      setOppForm({
        ...oppForm,
        tags: [...currentTags, tag],
      });
    }
    setNewOppTagInput('');
  };

  const handleRemoveTagFromNewOpp = (tagToRemove: string) => {
    setOppForm({
      ...oppForm,
      tags: (oppForm.tags || []).filter((t) => t !== tagToRemove),
    });
  };

  // Handlers para Drag and Drop
  const handleDragStart = (e: React.DragEvent, oppId: string) => {
    e.dataTransfer.setData('text/plain', oppId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedOppId(oppId);
  };

  const handleDragEnd = () => {
    setDraggedOppId(null);
    setDragOverStage(null);
  };

  const handleDragOver = (e: React.DragEvent, stageId: OpportunityStage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStage !== stageId) {
      setDragOverStage(stageId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, stageId: OpportunityStage) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (dragOverStage === stageId) {
      setDragOverStage(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetStage: OpportunityStage) => {
    e.preventDefault();
    const oppId = e.dataTransfer.getData('text/plain') || draggedOppId;
    setDragOverStage(null);
    setDraggedOppId(null);

    if (!oppId) return;
    const opp = opportunities.find((o) => o.id === oppId);
    if (!opp || opp.stage === targetStage) return;

    // Actualizar etapa en el ERP con bitácora de actividad y timestamp
    const stageObj = stages.find((s) => s.id === targetStage);
    const stageLabel = stageObj?.label || targetStage;
    const nowIso = new Date().toISOString();
    const stageActivity: OpportunityActivity = {
      id: `ACT-${Date.now()}`,
      type: 'stage_change',
      description: `Etapa actualizada a: ${stageLabel}`,
      authorName: currentUser.name,
      timestamp: nowIso,
    };

    if (targetStage === 'awarded' && !opp.awardedProjectId) {
      setOppPreviousStage(opp.stage);
      setSelectedOppForAward({ ...opp, stage: 'awarded' });
      notify?.(
        'info',
        'Registro de Proyecto Requerido',
        `Para adjudicar "${opp.title}", complete los datos obligatorios del proyecto.`
      );
    } else {
      updateOpportunity(oppId, {
        stage: targetStage,
        lastActivityAt: nowIso,
        activityLog: [stageActivity, ...(opp.activityLog || [])],
      });
      notify?.(
        'info',
        'Etapa Actualizada',
        `"${opp.title}" se movió a la etapa ${stageLabel}.`
      );
    }
  };

  // Formulario Nuevo Contacto
  const [contactForm, setContactForm] = useState({
    name: '',
    company: '',
    role: '',
    email: '',
    phone: '',
    stcSystem: '',
    country: 'Colombia',
    notes: '',
    tags: [] as string[],
    nit: '',
    dunsId: '',
    website: '',
  });

  const stages: { id: OpportunityStage; label: string; color: string; badge: string }[] = [
    { id: 'prospecting', label: 'Prospección', color: 'border-slate-300', badge: 'bg-slate-100 text-slate-700' },
    { id: 'qualification', label: 'Calificación', color: 'border-blue-300', badge: 'bg-blue-100 text-blue-700' },
    { id: 'technical_proposal', label: 'Oferta Técnica', color: 'border-indigo-300', badge: 'bg-indigo-100 text-indigo-700' },
    { id: 'economic_proposal', label: 'Oferta Económica', color: 'border-amber-300', badge: 'bg-amber-100 text-amber-700' },
    { id: 'under_review', label: 'Revisión Cliente', color: 'border-purple-300', badge: 'bg-purple-100 text-purple-700' },
    { id: 'awarded', label: 'Adjudicada', color: 'border-emerald-400', badge: 'bg-emerald-100 text-emerald-800' },
  ];

  const handleCreateOpp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oppForm.title || !oppForm.clientName) return;

    const trm = currentTrm > 0 ? currentTrm : 4150;
    const isCop = oppForm.currency === 'COP';
    const numVal = Number(oppForm.estimatedValue) || 0;
    const estUSD = isCop ? Math.round(numVal / trm) : numVal;

    createOpportunity({
      ...oppForm,
      estimatedValue: numVal,
      estimatedValueUSD: estUSD,
      clientId: `CLI-${Date.now()}`,
      assignedOwnerId: currentUser.id,
      assignedOwnerName: currentUser.name,
    });

    setIsNewOppModalOpen(false);
    setOppForm({
      title: '',
      clientName: '',
      clientContactPerson: '',
      clientEmail: '',
      clientPhone: '',
      cableType: 'Aéreo Monocable Desembragable 10-MGD',
      country: 'Colombia',
      currency: 'COP',
      estimatedValue: 48500000,
      estimatedValueUSD: 11687,
      stage: 'qualification',
      expectedCloseDate: '2026-11-30',
      technicalSpecs: '',
      leadSource: 'Licitación Pública (SECOP II / Mercado Público)',
      tags: [],
    });
  };

  const handleCreateContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.company) return;

    createContact(contactForm);
    setIsNewContactModalOpen(false);
    setContactForm({
      name: '',
      company: '',
      role: '',
      email: '',
      phone: '',
      stcSystem: '',
      country: 'Colombia',
      notes: '',
      tags: [],
      nit: '',
      dunsId: '',
      website: '',
    });
  };

  const handleAward = (oppId: string, customProjectData?: Partial<Project>) => {
    const result = awardOpportunity(oppId, customProjectData);
    if (result.success) {
      setSelectedOppForAward(null);
      setOppPreviousStage(null);
    }
  };

  const handleCancelAward = () => {
    if (selectedOppForAward && oppPreviousStage && selectedOppForAward.stage !== oppPreviousStage) {
      // Revertir a la fase previa
      updateOpportunity(selectedOppForAward.id, {
        stage: oppPreviousStage,
      });
      notify?.('info', 'Adjudicación Cancelada', `La oportunidad se mantuvo en su fase anterior.`);
    }
    setSelectedOppForAward(null);
    setOppPreviousStage(null);
  };

  // Cuando se adjudica o gana una oportunidad, se retira del CRM y pasa a Proyectos
  useEffect(() => {
    const alreadyAwarded = opportunities.filter((o) => o.stage === 'awarded' || o.awardedProjectId);
    if (alreadyAwarded.length > 0) {
      alreadyAwarded.forEach((o) => {
        deleteOpportunity(o.id);
      });
    }
  }, [opportunities, deleteOpportunity]);

  const activeOpportunities = opportunities.filter(
    (o) => o.stage !== 'lost' && o.stage !== 'awarded' && !o.awardedProjectId
  );
  const totalPipelineValueCOP = activeOpportunities.reduce(
    (sum, o) => sum + getOppFinancialBreakdown(o, currentTrm).copVal,
    0
  );
  const totalPipelineValue = Math.round(totalPipelineValueCOP / (currentTrm > 0 ? currentTrm : 4150));

  const awardedCount = opportunities.filter((o) => o.stage === 'awarded' || o.awardedProjectId).length;
  const lostCount = opportunities.filter((o) => o.stage === 'lost').length;
  const closedTotal = awardedCount + lostCount;
  const winRate = closedTotal > 0 ? Math.round((awardedCount / closedTotal) * 100) : 68;

  // Oportunidades en riesgo (Deal Score IA < 40 o estancadas > 15 días)
  const dealsAtRisk = activeOpportunities.filter((opp) => {
    const score = opp.aiDealScore ?? calculateDealScore(opp).score;
    const lastAct = opp.lastActivityAt || opp.createdAt;
    const days = lastAct
      ? Math.max(0, Math.floor((Date.now() - new Date(lastAct).getTime()) / (1000 * 60 * 60 * 24)))
      : 0;
    return score < 40 || days > 15;
  });

  const filteredContacts = contacts.filter((cnt) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      cnt.name.toLowerCase().includes(q) ||
      cnt.company.toLowerCase().includes(q) ||
      cnt.stcSystem.toLowerCase().includes(q) ||
      (cnt.nit && cnt.nit.toLowerCase().includes(q)) ||
      (cnt.dunsId && cnt.dunsId.toLowerCase().includes(q)) ||
      (cnt.tags && cnt.tags.some((t) => t.toLowerCase().includes(q))) ||
      (cnt.salesPurchases?.industry && cnt.salesPurchases.industry.toLowerCase().includes(q))
    );
  });

  if (activeTab === 'contactos' && editingContact) {
    return (
      <div className="space-y-4">
        <ContactDetailModal
          contact={editingContact}
          allContacts={contacts}
          erpUsers={users}
          onClose={() => setEditingContact(null)}
          onSave={(updatedContact) => {
            updateContact(updatedContact.id, updatedContact);
            setEditingContact(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Barra de Acciones y Filtros Limpia con KPIs de Inteligencia Comercial */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder={activeTab === 'contactos' ? 'Buscar contacto por nombre, empresa, NIT o sistema...' : 'Buscar oportunidad por título, cliente o sistema...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#00668F]"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end w-full sm:w-auto">
          {activeTab === 'pipeline' && (
            <>
              <div className="bg-slate-50 px-3 py-1.5 rounded-xl text-center flex flex-col items-center justify-center min-w-[115px]">
                <span className="text-[10px] text-slate-500 block font-medium">Embudo Activo</span>
                <span className="text-xs font-black text-slate-900">{formatCOP(totalPipelineValueCOP)}</span>
                <span className="text-[9px] text-slate-500 font-semibold">{formatUSD(totalPipelineValue)}</span>
              </div>
              <div className="bg-slate-50 px-3 py-1.5 rounded-xl text-center flex flex-col items-center justify-center min-w-[75px]">
                <span className="text-[10px] text-slate-500 block font-medium">En Gestión</span>
                <span className="text-xs font-bold text-[#00668F]">{activeOpportunities.length}</span>
              </div>
              <div className="bg-slate-50 px-3 py-1.5 rounded-xl text-center flex flex-col items-center justify-center min-w-[75px]">
                <span className="text-[10px] text-slate-500 block font-medium">Tasa de Éxito</span>
                <span className="text-xs font-bold text-emerald-600">{winRate}%</span>
              </div>
              <div className="bg-slate-50 px-3 py-1.5 rounded-xl text-center flex flex-col items-center justify-center min-w-[75px]">
                <span className="text-[10px] text-slate-500 block font-medium">Ciclo Promedio</span>
                <span className="text-xs font-bold text-slate-700">~38d</span>
              </div>
              <div
                className={`px-3 py-1.5 rounded-xl text-center flex flex-col items-center justify-center min-w-[85px] ${
                  dealsAtRisk.length > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50'
                }`}
                title="Oportunidades con Calificación de Cierre < 40 o más de 15 días sin bitácora registrada"
              >
                <span className={`text-[10px] block font-medium ${dealsAtRisk.length > 0 ? 'text-amber-800' : 'text-slate-500'}`}>
                  En Riesgo
                </span>
                <span className={`text-xs font-bold ${dealsAtRisk.length > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
                  {dealsAtRisk.length}
                </span>
              </div>
              <button
                onClick={() => setIsNewOppModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#00668F] hover:bg-[#005273] text-white text-xs font-semibold shadow-xs transition-transform active:scale-95 cursor-pointer"
              >
                <Plus size={15} />
                <span>Nueva Oportunidad</span>
              </button>
            </>
          )}

          {activeTab === 'contactos' && (
            <button
              onClick={() => setIsNewContactModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#00668F] hover:bg-[#005273] text-white text-xs font-semibold shadow-xs transition-transform active:scale-95 cursor-pointer"
            >
              <Plus size={15} />
              <span>Nuevo Contacto</span>
            </button>
          )}
        </div>
      </div>

      {/* PESTAÑA 1: PIPELINE KANBAN (RESPONSIVO Y ADAPTABLE) */}
      {activeTab === 'pipeline' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 items-start w-full">
          {stages.map((stg) => {
            const oppsInStage = activeOpportunities.filter((o) => {
              const matchStage = o.stage === stg.id;
              const matchSearch =
                o.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                o.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (o.clientContactPerson && o.clientContactPerson.toLowerCase().includes(searchQuery.toLowerCase()));
              return matchStage && matchSearch;
            });

            const stageBreakdowns = oppsInStage.map((o) => getOppFinancialBreakdown(o, currentTrm));
            const stageTotalCOP = stageBreakdowns.reduce((sum, f) => sum + f.copVal, 0);
            const stageTotalUSD = stageBreakdowns.reduce((sum, f) => sum + f.usdVal, 0);

            return (
              <div
                key={stg.id}
                onDragOver={(e) => handleDragOver(e, stg.id)}
                onDragLeave={(e) => handleDragLeave(e, stg.id)}
                onDrop={(e) => handleDrop(e, stg.id)}
                className={`w-full min-w-0 rounded-2xl p-2.5 flex flex-col justify-between transition-all duration-150 ${
                  dragOverStage === stg.id && draggedOppId
                    ? 'bg-sky-50/90 ring-2 ring-[#00668F] ring-dashed shadow-md'
                    : 'bg-slate-50/90 border border-gray-200/90'
                }`}
              >
                <div>
                  {/* Encabezado de Columna con Botón + Superior */}
                  <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-gray-200">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full truncate ${stg.badge}`}>
                        {stg.label}
                      </span>
                      <span className="text-[10px] font-bold text-gray-500 shrink-0">({oppsInStage.length})</span>
                    </div>
                    <button
                      onClick={() => {
                        setOppForm((prev) => ({ ...prev, stage: stg.id }));
                        setIsNewOppModalOpen(true);
                      }}
                      title={`Agregar oportunidad en ${stg.label}`}
                      className="w-5 h-5 rounded-md bg-white border border-gray-200 hover:bg-[#00668F] hover:text-white hover:border-[#00668F] text-gray-600 flex items-center justify-center transition-colors cursor-pointer shadow-2xs shrink-0"
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                  <div className="mb-2">
                    <div className="text-[10px] text-gray-900 font-extrabold truncate">
                      {formatCOP(stageTotalCOP)}
                    </div>
                    <div className="text-[8.5px] text-gray-400 font-semibold truncate">
                      {formatUSD(stageTotalUSD)}
                    </div>
                  </div>

                  {/* Tarjetas de Oportunidad */}
                  <div className="space-y-2">
                    {/* Indicador de soltar cuando se arrastra sobre esta columna */}
                    {dragOverStage === stg.id && draggedOppId && (
                      <div className="p-2.5 text-center text-[10.5px] font-bold text-[#00668F] bg-sky-100/90 border-2 border-dashed border-[#00668F] rounded-xl animate-pulse flex items-center justify-center gap-1.5 shadow-2xs">
                        <span>⬇️</span>
                        <span>Soltar en {stg.label}</span>
                      </div>
                    )}

                    {oppsInStage.map((opp) => (
                      <div
                        key={opp.id}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, opp.id)}
                        onDragEnd={handleDragEnd}
                        className={`bg-white p-2.5 rounded-xl border border-gray-200/90 shadow-2xs hover:shadow-xs transition-all relative group cursor-grab active:cursor-grabbing select-none ${
                          draggedOppId === opp.id ? 'opacity-40 scale-95 ring-2 ring-[#00668F]' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <div className="flex items-center gap-1 min-w-0 flex-1">
                            <span title="Arrastrar para mover de etapa" className="text-gray-400 group-hover:text-[#00668F] transition-colors shrink-0 cursor-grab">
                              <GripVertical size={13} />
                            </span>
                            <span className="font-bold text-[#00668F] text-[10.5px] whitespace-nowrap tracking-tight shrink-0">
                              {opp.code}
                            </span>
                            <span
                              className="bg-slate-100 px-1.5 py-0.5 rounded text-[8.5px] font-semibold text-gray-600 truncate max-w-[55px]"
                              title={opp.country}
                            >
                              {opp.country}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {/* Badge Deal Score IA */}
                            {(() => {
                              const ds = calculateDealScore(opp);
                              const score = opp.aiDealScore ?? ds.score;
                              const colorClass =
                                score >= 70
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : score >= 40
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200';
                              return (
                                <span
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8.5px] font-bold border ${colorClass}`}
                                  title={`Deal Score IA: ${score}%\n${opp.aiDealScoreDetails || ds.details}`}
                                >
                                  <Sparkles size={8.5} />
                                  <span>{score}%</span>
                                </span>
                              );
                            })()}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectOppToEdit(opp);
                              }}
                              title="Gestionar Oportunidad (Consola Integral)"
                              className="p-1 rounded-md text-gray-400 hover:text-[#00668F] hover:bg-sky-50 transition-colors cursor-pointer shrink-0"
                            >
                              <Pencil size={11} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOppToDelete(opp);
                              }}
                              title="Eliminar Oportunidad"
                              className="p-1 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>

                        <div
                          onClick={() => handleSelectOppToEdit(opp)}
                          className="cursor-pointer space-y-1.5"
                        >
                          <h4 className="text-[11px] font-bold text-gray-900 leading-snug line-clamp-2 hover:text-[#00668F] transition-colors">
                            {opp.title}
                          </h4>

                          <div className="text-[10px] text-gray-700 font-medium flex items-center gap-1">
                            <Building2 size={11} className="text-gray-400 shrink-0" />
                            <span className="truncate">{opp.clientName}</span>
                          </div>

                          <div className="text-[10px] text-gray-500 truncate">
                            ⚙️ {opp.cableType}
                          </div>

                          {/* Alertas de Estancamiento / Vencimiento */}
                          {(() => {
                            const lastAct = opp.lastActivityAt || opp.createdAt;
                            const daysWithoutAct = lastAct
                              ? Math.max(0, Math.floor((Date.now() - new Date(lastAct).getTime()) / (1000 * 60 * 60 * 24)))
                              : 0;

                            const closeDateMs = new Date(opp.expectedCloseDate).getTime();
                            const isOverdue = !isNaN(closeDateMs) && closeDateMs < Date.now();
                            const isDueSoon =
                              !isNaN(closeDateMs) && closeDateMs - Date.now() < 7 * 24 * 60 * 60 * 1000 && !isOverdue;

                            if (daysWithoutAct <= 15 && !isOverdue && !isDueSoon) return null;

                            return (
                              <div className="flex flex-wrap gap-1 items-center pt-0.5">
                                {daysWithoutAct > 15 && (
                                  <span
                                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold border ${
                                      daysWithoutAct > 45
                                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                                        : 'bg-amber-50 text-amber-700 border-amber-200'
                                    }`}
                                    title={`Sin gestión registrada hace ${daysWithoutAct} días`}
                                  >
                                    <Clock size={8} />
                                    <span>{daysWithoutAct}d sin gestión</span>
                                  </span>
                                )}
                                {isOverdue && (
                                  <span
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
                                    title="Fecha estimada de cierre superada"
                                  >
                                    <AlertTriangle size={8} />
                                    <span>Cierre Vencido</span>
                                  </span>
                                )}
                                {isDueSoon && (
                                  <span
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-50 text-amber-700 border border-amber-200"
                                    title="Fecha de cierre en menos de 7 días"
                                  >
                                    <Clock size={8} />
                                    <span>Vence pronto</span>
                                  </span>
                                )}
                              </div>
                            );
                          })()}

                          {/* Origen del Prospecto / Lead Source */}
                          {opp.leadSource && (
                            <div className="flex items-center gap-1">
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8.5px] font-semibold bg-emerald-50 text-emerald-700 leading-tight break-words max-w-full"
                                title={`Origen: ${opp.leadSource}`}
                              >
                                <span className="shrink-0">🎯</span>
                                <span className="break-words line-clamp-1">{opp.leadSource}</span>
                              </span>
                            </div>
                          )}

                          {/* Etiquetas / Tags de la Oportunidad */}
                          {opp.tags && opp.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {opp.tags.map((tg, idx) => (
                                <span
                                  key={idx}
                                  className="text-[8px] font-semibold bg-sky-50 text-[#00668F] px-1.5 py-0.5 rounded-md"
                                >
                                  #{tg}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Datos de Contacto del Cliente Sincronizados */}
                          {(opp.clientContactPerson || opp.clientPhone || opp.clientEmail) && (
                            <div className="pt-1 border-t border-gray-100 text-[9px] text-gray-600 space-y-0.5 bg-slate-50/70 p-1.5 rounded-lg">
                              {opp.clientContactPerson && (
                                <div className="flex items-center gap-1 font-semibold text-gray-800 truncate">
                                  <span>👤</span>
                                  <span className="truncate">{opp.clientContactPerson}</span>
                                </div>
                              )}
                              {opp.clientPhone && (
                                <div className="flex items-center gap-1 truncate text-gray-600">
                                  <span>📞</span>
                                  <span className="truncate">{opp.clientPhone}</span>
                                </div>
                              )}
                              {opp.clientEmail && (
                                <div className="flex items-center gap-1 truncate text-gray-500">
                                  <span>✉️</span>
                                  <span className="truncate">{opp.clientEmail}</span>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="pt-1 border-t border-gray-100 flex items-center justify-between text-[11px]">
                            {(() => {
                              const fin = getOppFinancialBreakdown(opp, currentTrm);
                              return (
                                <div className="flex flex-col min-w-0">
                                  <span className="font-extrabold text-slate-900 text-xs truncate">
                                    {fin.primary}
                                  </span>
                                  <span className="text-[9.5px] text-slate-500 font-medium">
                                    {fin.secondary}
                                  </span>
                                </div>
                              );
                            })()}
                            <span className="text-[9px] text-gray-400 truncate ml-1 shrink-0">
                              {opp.expectedCloseDate}
                            </span>
                          </div>
                        </div>

                        {/* Botonera de Acciones Rápidas (Llamar, Reunión, Outlook) */}
                        <div className="mt-2 pt-1.5 border-t border-gray-100 grid grid-cols-3 gap-1 text-[9px]">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickCall(opp);
                            }}
                            title="Registrar llamada rápida o contactar cliente"
                            className="py-1 px-1 rounded-lg bg-slate-100 hover:bg-[#00668F] hover:text-white text-gray-700 font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer min-w-0"
                          >
                            <Phone size={10} className="shrink-0" />
                            <span className="truncate">Llamar</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenMeetingModal(opp);
                            }}
                            title="Agendar reunión de cliente en Calendario & Teams"
                            className="py-1 px-1 rounded-lg bg-slate-100 hover:bg-[#00668F] hover:text-white text-gray-700 font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer min-w-0"
                          >
                            <Calendar size={10} className="shrink-0" />
                            <span className="truncate">Reunión</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickOutlookEmail(opp);
                            }}
                            title="Redactar correo oficial en Outlook Web"
                            className="py-1 px-1 rounded-lg bg-slate-100 hover:bg-sky-600 hover:text-white text-gray-700 font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer min-w-0"
                          >
                            <Mail size={10} className="shrink-0" />
                            <span className="truncate">Outlook</span>
                          </button>
                        </div>

                        {/* Botón de Adjudicar Contrato -> Proyecto Automático */}
                        {opp.stage !== 'awarded' && (
                          <div className="mt-1.5 pt-1.5 border-t border-dashed border-gray-200">
                            <button
                              onClick={() => {
                                setOppPreviousStage(opp.stage);
                                setSelectedOppForAward(opp);
                              }}
                              className="w-full flex items-center justify-center gap-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-[10px] font-bold shadow-2xs transition-all cursor-pointer leading-none min-w-0"
                            >
                              <Sparkles size={11} className="shrink-0" />
                              <span className="truncate">Adjudicar a Proyecto STC</span>
                            </button>
                          </div>
                        )}

                        {opp.stage === 'awarded' && (
                          <div className="mt-1.5 pt-1.5 border-t border-emerald-100 flex items-center justify-between text-[9px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-lg">
                            <span>Proyecto Creado</span>
                            <CheckCircle2 size={11} />
                          </div>
                        )}
                      </div>
                    ))}

                    {oppsInStage.length === 0 && (
                      <div className="p-3 text-center text-[10px] text-gray-400 border border-dashed border-gray-200 rounded-xl">
                        Sin oportunidades
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PESTAÑA 2: DIRECTORIO DE CONTACTOS */}
      {activeTab === 'contactos' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredContacts.map((cnt) => (
              <div
                key={cnt.id}
                className="bg-white p-5 rounded-2xl shadow-xs hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-gray-900 text-sm truncate">{cnt.name}</h4>
                      <p className="text-xs text-[#00668F] font-semibold truncate">{cnt.role}</p>
                      <p className="text-xs text-gray-600 font-bold truncate flex items-center gap-1.5 mt-0.5">
                        <Building2 size={13} className="text-gray-400 shrink-0" />
                        <span>{cnt.company}</span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {cnt.country}
                      </span>
                      {cnt.dianBilling?.isLargeTaxpayer && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-900">
                          ★ Gran Contribuyente
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Etiquetas / Clasificación */}
                  {cnt.tags && cnt.tags.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {cnt.tags.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-100 text-[#00668F]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Identificación Corporativa & Datos de Contacto */}
                  <div className="text-[11px] text-gray-600 bg-slate-50 p-3 rounded-xl space-y-1.5">
                    {cnt.nit && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400 font-medium">NIT / Tax ID:</span>
                        <span className="font-mono font-bold text-gray-800">{cnt.nit}</span>
                      </div>
                    )}
                    {cnt.dunsId && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 font-medium">DUNS:</span>
                        <span className="font-mono font-bold text-gray-800">{cnt.dunsId}</span>
                      </div>
                    )}
                    {cnt.website && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 font-medium">Sitio Web:</span>
                        <a
                          href={cnt.website.startsWith('http') ? cnt.website : `https://${cnt.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#00668F] hover:underline font-semibold flex items-center gap-1 truncate max-w-[170px]"
                        >
                          <span>{cnt.website.replace(/^https?:\/\//, '')}</span>
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    )}
                    <div className="pt-1.5 space-y-1">
                      <div className="truncate">🚡 <span className="font-medium text-gray-700">{cnt.stcSystem}</span></div>
                      <div className="truncate">✉️ <span className="text-gray-700">{cnt.email}</span></div>
                      <div className="truncate">📞 <span className="text-gray-700">{cnt.phone}</span></div>
                    </div>
                  </div>

                  {cnt.notes && (
                    <p className="text-[11px] text-gray-500 italic pl-2 border-l-2 border-[#00668F] line-clamp-2">
                      "{cnt.notes}"
                    </p>
                  )}
                </div>

                {/* Botones de Acción: Ficha Completa & Edición */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={() => setEditingContact(cnt)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#00668F]/10 hover:bg-[#00668F] text-[#00668F] hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer group shadow-2xs"
                  >
                    <Maximize2 size={13} className="transition-transform group-hover:scale-110" />
                    <span>Ver Ficha Completa</span>
                  </button>
                  <button
                    onClick={() => setEditingContact(cnt)}
                    title="Editar Ficha"
                    className="p-2 rounded-xl text-gray-400 hover:text-[#00668F] hover:bg-sky-50 transition-colors cursor-pointer border border-gray-200"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => setContactToDelete(cnt)}
                    title="Eliminar Contacto"
                    className="p-2 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border border-gray-200"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PESTAÑA 3: COTIZACIONES & VENTAS */}
      {activeTab === 'ventas' && (
        <div className="bg-white rounded-xl p-3.5 sm:p-5 space-y-3 w-full max-w-full min-w-0 shadow-2xs">
          <h3 className="text-sm font-bold text-gray-900">Historial de Propuestas Técnico-Económicas</h3>
          <div className="overflow-x-auto w-full max-w-full">
            <table className="w-full text-xs text-left min-w-[650px]">
              <thead className="bg-gray-50 text-gray-500 font-semibold">
                <tr>
                  <th className="p-3">Código</th>
                  <th className="p-3">Proyecto / Licitación</th>
                  <th className="p-3">Operador</th>
                  <th className="p-3">Valor Estimado</th>
                  <th className="p-3">Etapa Comercial</th>
                  <th className="p-3">Fecha Estimada</th>
                  <th className="p-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {opportunities.map((opp) => (
                  <tr key={opp.id} className="hover:bg-slate-50/80">
                    <td className="p-3 font-bold text-[#00668F]">{opp.code}</td>
                    <td className="p-3 font-semibold text-gray-900">{opp.title}</td>
                    <td className="p-3 text-gray-600">{opp.clientName}</td>
                    <td className="p-3">
                      {(() => {
                        const fin = getOppFinancialBreakdown(opp, currentTrm);
                        return (
                          <>
                            <div className="font-bold text-gray-900">{fin.primary}</div>
                            <div className="text-[10px] text-gray-400 font-medium">{fin.secondary}</div>
                          </>
                        );
                      })()}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                        {opp.stage.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 text-gray-500">{opp.expectedCloseDate}</td>
                    <td className="p-3 text-right flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingOpp(opp)}
                        className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                        title="Editar Propuesta"
                      >
                        <Pencil size={11} />
                        Editar
                      </button>
                      {opp.stage !== 'awarded' ? (
                        <button
                          onClick={() => setSelectedOppForAward(opp)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-semibold cursor-pointer"
                        >
                          Adjudicar
                        </button>
                      ) : (
                        <span className="text-emerald-600 font-bold text-[11px]">Adjudicado</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PESTAÑA 4: WHATSAPP COMERCIAL */}
      {activeTab === 'whatsapp' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 max-w-2xl mx-auto">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="w-10 h-10 rounded-full shrink-0 aspect-square bg-emerald-500 text-white flex items-center justify-center font-bold shadow-2xs">
              <MessageCircle size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Canal de Contacto Directo WhatsApp Business</h3>
              <p className="text-xs text-gray-500">Integración con operadores de cable y solicitudes de auxilio técnico STC</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/60 text-xs">
              <div className="flex justify-between font-bold text-emerald-900">
                <span>Ing. Carlos Mendoza (Metro de Medellín)</span>
                <span className="text-[10px] text-emerald-700 font-normal">Ayer 16:45</span>
              </div>
              <p className="mt-1 text-gray-700">
                "Buenas tardes Alejandro, requerimos cotización formal para el reemplazo de mordazas en la Línea K durante la parada técnica de noviembre."
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-gray-200 text-xs">
              <div className="flex justify-between font-bold text-gray-800">
                <span>Dra. Ximena Morales (Cablebús CDMX)</span>
                <span className="text-[10px] text-gray-400 font-normal">Hace 2 días</span>
              </div>
              <p className="mt-1 text-gray-600">
                "Recibida la ficha técnica de la magnetografía. La mesa técnica de SEMOVI está revisando los pliegos."
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NUEVA OPORTUNIDAD COMERCIAL (100% REACTIVO Y ADAPTABLE) */}
      {isNewOppModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Cabecera Fija */}
            <div className="shrink-0 px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                <Briefcase size={18} className="text-[#00668F]" />
                Registrar Nueva Oportunidad STC
              </div>
              <button
                onClick={() => setIsNewOppModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Formulario con Scroll Interno Suave */}
            <form onSubmit={handleCreateOpp} className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 min-h-[22px] flex items-center">Título de la Oportunidad / Licitación</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Inspección Anual y Overhaul - Teleférico Monserrate"
                    value={oppForm.title}
                    onChange={(e) => setOppForm({ ...oppForm, title: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl bg-slate-100 text-gray-800 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 min-h-[22px] flex items-center">Cliente / Operador</label>
                    <input
                      type="text"
                      required
                      list="crm-contacts-datalist"
                      placeholder="Ej: Metro de Medellín"
                      value={oppForm.clientName}
                      onChange={(e) => {
                        const val = e.target.value;
                        const match = contacts.find((c) => c.company.toLowerCase() === val.toLowerCase());
                        if (match) {
                          setOppForm({
                            ...oppForm,
                            clientName: match.company,
                            clientContactPerson: match.name || oppForm.clientContactPerson,
                            clientEmail: match.email || oppForm.clientEmail,
                            clientPhone: match.phone || oppForm.clientPhone,
                            country: match.country || oppForm.country,
                            cableType: match.stcSystem || oppForm.cableType,
                          });
                        } else {
                          setOppForm({ ...oppForm, clientName: val });
                        }
                      }}
                      className="w-full text-xs p-2.5 rounded-xl bg-slate-100 text-gray-800 focus:bg-white focus:outline-hidden"
                    />
                    <datalist id="crm-contacts-datalist">
                      {contacts.map((c) => (
                        <option key={c.id} value={c.company}>{c.name} ({c.country})</option>
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <CreatableSelect
                      label="País"
                      value={oppForm.country}
                      onChange={(val) => setOppForm({ ...oppForm, country: val })}
                      options={catalogCountries}
                      moduleId="crm"
                      catalogKey="countries"
                      placeholder="Seleccionar o escribir país..."
                      onOpenConfig={() => setIsConfigModalOpen(true)}
                    />
                  </div>
                </div>

                {/* Información de Contacto / Negociador */}
                <div className="p-3 bg-slate-50 rounded-xl space-y-2">
                  <span className="text-[11px] font-bold text-[#00668F] uppercase tracking-wide block">
                    Información del Contacto (Sincronización Automática al Directorio)
                  </span>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 mb-0.5 min-h-[20px] flex items-center">Persona de Contacto / Encargado</label>
                    <input
                      type="text"
                      placeholder="Ej: Ing. Jorge Restrepo (Gerente de Mantenimiento)"
                      value={oppForm.clientContactPerson}
                      onChange={(e) => setOppForm({ ...oppForm, clientContactPerson: e.target.value })}
                      className="w-full text-xs p-2 rounded-lg bg-white text-gray-800 focus:outline-hidden"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-start">
                    <div>
                      <label className="text-[11px] font-semibold text-gray-700 mb-0.5 min-h-[20px] flex items-center">Teléfono / WhatsApp</label>
                      <input
                        type="text"
                        placeholder="+57 310 123 4567"
                        value={oppForm.clientPhone}
                        onChange={(e) => setOppForm({ ...oppForm, clientPhone: e.target.value })}
                        className="w-full text-xs p-2 rounded-lg bg-white text-gray-800 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-gray-700 mb-0.5 min-h-[20px] flex items-center">Correo Electrónico</label>
                      <input
                        type="email"
                        placeholder="jorge.restrepo@metro.gov.co"
                        value={oppForm.clientEmail}
                        onChange={(e) => setOppForm({ ...oppForm, clientEmail: e.target.value })}
                        className="w-full text-xs p-2 rounded-lg bg-white text-gray-800 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 min-h-[22px] flex items-center">Moneda</label>
                    <select
                      value={oppForm.currency || 'COP'}
                      onChange={(e) => {
                        const newCurr = e.target.value as 'COP' | 'USD' | 'EUR';
                        const trm = currentTrm > 0 ? currentTrm : 4150;
                        let newVal = oppForm.estimatedValue;
                        if (oppForm.currency === 'COP' && newCurr !== 'COP') {
                          newVal = Math.round(oppForm.estimatedValue / trm);
                        } else if (oppForm.currency !== 'COP' && newCurr === 'COP') {
                          newVal = Math.round(oppForm.estimatedValue * trm);
                        }
                        const estUSD = newCurr === 'COP' ? Math.round(newVal / trm) : newVal;
                        setOppForm({
                          ...oppForm,
                          currency: newCurr,
                          estimatedValue: newVal,
                          estimatedValueUSD: estUSD,
                        });
                      }}
                      className="w-full text-xs p-2.5 rounded-xl bg-slate-100 text-gray-800 font-bold focus:bg-white focus:outline-hidden cursor-pointer"
                    >
                      <option value="COP">COP ($ Pesos)</option>
                      <option value="USD">USD ($ Dólares)</option>
                      <option value="EUR">EUR (€ Euros)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 min-h-[22px] flex items-center justify-between">
                      <span>Valor ({oppForm.currency})</span>
                      <span className="text-[10px] text-gray-400 font-normal">
                        {oppForm.currency === 'COP'
                          ? `≈ ${formatUSD(Math.round((oppForm.estimatedValue || 0) / (currentTrm || 4150)))}`
                          : `≈ ${formatCOP(convertUSDToCOP(oppForm.estimatedValue || 0, currentTrm))}`}
                      </span>
                    </label>
                    <input
                      type="number"
                      min="100"
                      required
                      value={oppForm.estimatedValue}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        const trm = currentTrm > 0 ? currentTrm : 4150;
                        const estUSD = oppForm.currency === 'COP' ? Math.round(val / trm) : val;
                        setOppForm({
                          ...oppForm,
                          estimatedValue: val,
                          estimatedValueUSD: estUSD,
                        });
                      }}
                      className="w-full text-xs p-2.5 rounded-xl bg-slate-100 text-gray-800 font-semibold focus:bg-white focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 min-h-[22px] flex items-center">Fecha Estimada de Cierre</label>
                    <input
                      type="date"
                      required
                      value={oppForm.expectedCloseDate}
                      onChange={(e) => setOppForm({ ...oppForm, expectedCloseDate: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl bg-slate-100 text-gray-800 focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <CreatableSelect
                    label="Tipo de Sistema STC"
                    value={oppForm.cableType}
                    onChange={(val) => setOppForm({ ...oppForm, cableType: val })}
                    options={catalogCableTypes}
                    moduleId="crm"
                    catalogKey="cableTypes"
                    placeholder="Seleccionar o escribir tecnología STC..."
                    onOpenConfig={() => setIsConfigModalOpen(true)}
                  />
                </div>

                <div>
                  <CreatableSelect
                    label="Origen de la Oportunidad / Prospecto"
                    value={oppForm.leadSource || ''}
                    onChange={(val) => setOppForm({ ...oppForm, leadSource: val })}
                    options={catalogLeadSources}
                    moduleId="crm"
                    catalogKey="leadSources"
                    placeholder="Seleccionar o escribir origen (Licitación, Referido, etc)..."
                    onOpenConfig={() => setIsConfigModalOpen(true)}
                  />
                </div>

                {/* Etiquetas / Tags */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-700">Etiquetas / Tags</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Escribir etiqueta (ej: Licitación, Urgente)..."
                      value={newOppTagInput}
                      onChange={(e) => setNewOppTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTagToNewOpp();
                        }
                      }}
                      className="flex-1 text-xs p-2 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F]"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddTagToNewOpp()}
                      className="px-3 py-2 bg-slate-100 hover:bg-[#00668F] hover:text-white text-gray-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      Añadir
                    </button>
                  </div>

                  {oppForm.tags && oppForm.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {oppForm.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-[#00668F]"
                        >
                          #{tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTagFromNewOpp(tag)}
                            className="hover:text-red-600 cursor-pointer"
                          >
                            <X size={11} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Sugerencias Rápidas */}
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    <span className="text-[10px] text-gray-400 font-medium">Sugeridas:</span>
                    {SUGGESTED_TAGS.map((sug) => {
                      const isSelected = (oppForm.tags || []).includes(sug);
                      return (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              handleRemoveTagFromNewOpp(sug);
                            } else {
                              handleAddTagToNewOpp(sug);
                            }
                          }}
                          className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#00668F] text-white'
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                          }`}
                        >
                          {isSelected ? `✓ ${sug}` : `+ ${sug}`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Alcance Técnico Inicial</label>
                  <textarea
                    rows={2}
                    placeholder="Resumen del requerimiento de ingeniería, repuestos o paradas programadas..."
                    value={oppForm.technicalSpecs}
                    onChange={(e) => setOppForm({ ...oppForm, technicalSpecs: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F]"
                  />
                </div>
              </div>

              {/* Pie Fijo Siempre Visible */}
              <div className="shrink-0 px-5 py-3 border-t border-gray-100 bg-gray-50/90 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewOppModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200/70 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-[#00668F] hover:bg-[#005273] text-white rounded-xl shadow-xs cursor-pointer active:scale-95 transition-transform"
                >
                  Guardar Oportunidad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL INTERFAZ 1: ADJUDICAR OPORTUNIDAD -> CREAR PROYECTO STC AUTOMÁTICAMENTE */}
      {selectedOppForAward && (
        <AwardOpportunityModal
          opportunity={selectedOppForAward}
          partners={partners}
          contacts={contacts}
          erpUsers={users}
          currentTrm={currentTrm}
          onClose={handleCancelAward}
          onConfirmAward={(oppId, customData) => handleAward(oppId, customData)}
        />
      )}

      {/* MODAL: NUEVO CONTACTO */}
      {isNewContactModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full max-h-[88vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
            {/* Cabecera Fija */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-slate-50/60 shrink-0">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                <Users size={18} className="text-[#00668F]" />
                Nuevo Contacto Operativo STC
              </div>
              <button
                onClick={() => setIsNewContactModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-200/60 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Contenido Desplazable */}
            <form onSubmit={handleCreateContact} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Ing. Jorge Restrepo"
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Empresa / Operador</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Metrocable Medellín / Cablebús CDMX"
                    value={contactForm.company}
                    onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Cargo</label>
                    <input
                      type="text"
                      placeholder="Ej: Jefe de Mantenimiento"
                      value={contactForm.role}
                      onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Sistema STC</label>
                    <input
                      type="text"
                      placeholder="Ej: Línea K / L1"
                      value={contactForm.stcSystem}
                      onChange={(e) => setContactForm({ ...contactForm, stcSystem: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      placeholder="correo@operador.com"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Teléfono</label>
                    <input
                      type="text"
                      placeholder="+57 300 000 0000"
                      value={contactForm.phone}
                      onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">NIT / Tax ID</label>
                    <input
                      type="text"
                      placeholder="Ej: 900.123.456-7"
                      value={contactForm.nit}
                      onChange={(e) => setContactForm({ ...contactForm, nit: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">DUNS / ID Empresa</label>
                    <input
                      type="text"
                      placeholder="Ej: 85-123-4567"
                      value={contactForm.dunsId}
                      onChange={(e) => setContactForm({ ...contactForm, dunsId: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F] font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Sitio Web Oficial</label>
                  <input
                    type="text"
                    placeholder="https://www.empresa.com"
                    value={contactForm.website}
                    onChange={(e) => setContactForm({ ...contactForm, website: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Etiquetas (separadas por comas)</label>
                  <input
                    type="text"
                    placeholder="Cliente VIP, Operador STC, Gobierno"
                    value={contactForm.tags.join(', ')}
                    onChange={(e) =>
                      setContactForm({
                        ...contactForm,
                        tags: e.target.value
                          .split(',')
                          .map((t) => t.trim())
                          .filter(Boolean),
                      })
                    }
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F]"
                  />
                </div>
              </div>

              {/* Pie Fijo Siempre Visible */}
              <div className="flex items-center justify-end gap-2 px-5 py-3 bg-gray-50 border-t border-gray-200/80 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsNewContactModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200/70 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-[#00668F] text-white rounded-xl shadow-xs hover:bg-[#005273] cursor-pointer"
                >
                  Guardar Contacto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL / CONSOLA DE OPORTUNIDAD COMERCIAL STC (6 PESTAÑAS INTEGRALES) */}
      {/* ========================================================================= */}
      {editingOpp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-gray-200">
            {/* Cabecera Fija con Color Corporativo Sólido */}
            <div className="bg-[#00668F] text-white px-5 py-3.5 shrink-0 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white shrink-0">
                  <Briefcase size={20} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full text-white">
                      {editingOpp.code}
                    </span>
                    <span className="text-[10px] text-sky-200 truncate">
                      {editingOpp.country} • {editingOpp.clientName}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white truncate">
                    {editingOpp.title}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Badge Deal Score IA */}
                {(() => {
                  const ds = calculateDealScore(editingOpp);
                  const score = editingOpp.aiDealScore ?? ds.score;
                  return (
                    <div
                      className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 text-white text-xs font-bold"
                      title={editingOpp.aiDealScoreDetails || ds.details}
                    >
                      <Sparkles size={14} className="text-amber-300" />
                      <span>{score}% Deal Score</span>
                    </div>
                  );
                })()}

                <button
                  type="button"
                  onClick={() => {
                    updateOpportunity(editingOpp.id, editingOpp);
                    notify?.('success', 'Cambios Guardados', `Oportunidad ${editingOpp.code} actualizada correctamente.`);
                    setEditingOpp(null);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Check size={14} />
                  <span>Guardar</span>
                </button>

                <button
                  onClick={() => setEditingOpp(null)}
                  className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Barra de Navegación por Pestañas */}
            <div className="flex flex-wrap items-center gap-1.5 px-4 py-2.5 border-b border-gray-200 bg-slate-50 shrink-0">
              <button
                type="button"
                onClick={() => setOppModalTab('general')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                  oppModalTab === 'general'
                    ? 'bg-[#00668F] text-white shadow-2xs'
                    : 'text-gray-600 hover:bg-slate-200/70'
                }`}
              >
                <Layers size={13} />
                <span>General & Score</span>
              </button>

              <button
                type="button"
                onClick={() => setOppModalTab('bitacora')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                  oppModalTab === 'bitacora'
                    ? 'bg-[#00668F] text-white shadow-2xs'
                    : 'text-gray-600 hover:bg-slate-200/70'
                }`}
              >
                <History size={13} />
                <span>Bitácora</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                  {editingOpp.activityLog?.length || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setOppModalTab('cotizador')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                  oppModalTab === 'cotizador'
                    ? 'bg-[#00668F] text-white shadow-2xs'
                    : 'text-gray-600 hover:bg-slate-200/70'
                }`}
              >
                <HandCoins size={13} />
                <span>Cotizador & Precios</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                  {editingOpp.quotations?.length || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setOppModalTab('pliegos')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                  oppModalTab === 'pliegos'
                    ? 'bg-[#00668F] text-white shadow-2xs'
                    : 'text-gray-600 hover:bg-slate-200/70'
                }`}
              >
                <FileCheck size={13} />
                <span>Pliegos Licitación</span>
                {editingOpp.pliegoAnalysis && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                    editingOpp.pliegoAnalysis.intecknoFitVerdict === 'cumple'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-amber-500 text-white'
                  }`}>
                    {editingOpp.pliegoAnalysis.intecknoFitVerdict}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setOppModalTab('stakeholders')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                  oppModalTab === 'stakeholders'
                    ? 'bg-[#00668F] text-white shadow-2xs'
                    : 'text-gray-600 hover:bg-slate-200/70'
                }`}
              >
                <Users size={13} />
                <span>Comité del Cliente (Buying Center)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                  {editingOpp.stakeholders?.length || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setOppModalTab('propuesta')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                  oppModalTab === 'propuesta'
                    ? 'bg-[#00668F] text-white shadow-2xs'
                    : 'text-gray-600 hover:bg-slate-200/70'
                }`}
              >
                <Sparkles size={13} className="text-amber-500" />
                <span>Propuesta Comercial</span>
              </button>
            </div>

            {/* Contenedor de Contenido Desplazable */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* ================================================================= */}
              {/* PESTAÑA 1: GENERAL & PARÁMETROS */}
              {/* ================================================================= */}
              {oppModalTab === 'general' && (
                <div className="space-y-4">
                  {/* Tarjeta de Inteligencia Comercial: Deal Score IA */}
                  {(() => {
                    const ds = calculateDealScore(editingOpp, dealScoreSettings);
                    const score = editingOpp.aiDealScore ?? ds.score;
                    const details = editingOpp.aiDealScoreDetails || ds.details;
                    const factors = editingOpp.aiDealScoreFactors || ds.factors;

                    return (
                      <div className="p-4 rounded-2xl bg-slate-50 border border-gray-200 space-y-3">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-12 h-12 rounded-full aspect-square shrink-0 flex items-center justify-center font-bold text-lg text-white shadow-xs ${
                                score >= 70 ? 'bg-emerald-600' : score >= 40 ? 'bg-amber-500' : 'bg-rose-600'
                              }`}
                            >
                              {score}%
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <Sparkles size={14} className="text-[#00668F]" />
                                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                                  Probabilidad de Cierre Comercial (Deal Score)
                                </h4>
                              </div>
                              <p className="text-xs text-gray-600 mt-0.5 max-w-xl">{details}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 shrink-0 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => {
                                const recalculated = calculateDealScore(editingOpp, dealScoreSettings);
                                setEditingOpp({
                                  ...editingOpp,
                                  aiDealScore: recalculated.score,
                                  aiDealScoreDetails: recalculated.details,
                                  aiDealScoreFactors: recalculated.factors,
                                });
                                notify?.('info', 'Score Recalculado', `Nuevo Deal Score: ${recalculated.score}%`);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-gray-300 hover:bg-slate-100 text-gray-700 text-xs font-bold transition-colors cursor-pointer"
                              title="Recalcular con los parámetros actuales"
                            >
                              <RefreshCw size={12} />
                              <span>Recalcular</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setIsConfiguringDealScore(!isConfiguringDealScore);
                                setShowDealScoreExplainer(false);
                              }}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                                isConfiguringDealScore
                                  ? 'bg-[#00668F] text-white shadow-xs'
                                  : 'bg-white border border-gray-300 hover:bg-slate-100 text-gray-700'
                              }`}
                              title="Configurar pesos y criterios de cálculo"
                            >
                              <SlidersHorizontal size={12} />
                              <span>Configurar Factores</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setShowDealScoreExplainer(!showDealScoreExplainer);
                                setIsConfiguringDealScore(false);
                              }}
                              className="p-1.5 rounded-xl bg-white border border-gray-300 hover:bg-slate-100 text-gray-600 text-xs font-bold transition-colors cursor-pointer"
                              title="¿Cómo funciona la probabilidad de cierre?"
                            >
                              <HelpCircle size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Control de Ajuste Manual de Probabilidad */}
                        <div className="p-2.5 bg-white rounded-xl border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-gray-700">
                            Ajuste Fino Manual de Probabilidad:
                          </span>
                          <div className="flex items-center gap-3 w-full sm:w-auto">
                            <input
                              type="range"
                              min={0}
                              max={100}
                              step={5}
                              value={score}
                              onChange={(e) => {
                                const newScore = Number(e.target.value);
                                setEditingOpp({
                                  ...editingOpp,
                                  aiDealScore: newScore,
                                });
                              }}
                              className="w-full sm:w-44 accent-[#00668F] cursor-pointer"
                            />
                            <span className="font-bold text-gray-900 w-10 text-right font-mono">
                              {score}%
                            </span>
                          </div>
                        </div>

                        {/* Factores de Evaluación Ponderados */}
                        <div className="pt-2 border-t border-gray-200">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                            Factores Clave Evaluados en esta Oportunidad:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {factors.map((f, idx) => (
                              <span
                                key={idx}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold ${
                                  f.isPositive
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                <span>{f.impact}</span>
                                <span>•</span>
                                <span>{f.factor}</span>
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Panel Pedagógico: ¿Cómo funciona el Deal Score? */}
                        {showDealScoreExplainer && (
                          <div className="p-3.5 bg-sky-50/80 rounded-xl border border-sky-200 text-xs space-y-2 animate-in fade-in duration-150">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[#00668F] uppercase text-[10px] tracking-wide flex items-center gap-1.5">
                                <Info size={13} />
                                Guía de Ponderación Inteckno: ¿Qué evalúa el sistema?
                              </span>
                              <button
                                type="button"
                                onClick={() => setShowDealScoreExplainer(false)}
                                className="text-sky-700 hover:text-sky-900 font-bold text-xs cursor-pointer"
                              >
                                Entendido
                              </button>
                            </div>
                            <p className="text-gray-700 leading-relaxed text-[11px]">
                              La probabilidad de cierre predice el éxito de una propuesta con base en 6 pilares de negocio:
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                              <div className="p-2 bg-white rounded-lg border border-sky-100">
                                <strong className="text-gray-900">1. Especialidad Core STC:</strong> Los proyectos de teleféricos o cables suman puntos porque Inteckno posee ventaja comparativa directa en ingeniería especializada.
                              </div>
                              <div className="p-2 bg-white rounded-lg border border-sky-100">
                                <strong className="text-gray-900">2. Infraestructura Territorial:</strong> En Colombia tenemos taller y respuesta inmediata. En el corredor LATAM (México, Ecuador, Bolivia) se evalúa la viabilidad operativa.
                              </div>
                              <div className="p-2 bg-white rounded-lg border border-sky-100">
                                <strong className="text-gray-900">3. Rango de Presupuesto:</strong> Los contratos entre $30k y $400k USD representan nuestra zona óptima de alta tasa de adjudicación.
                              </div>
                              <div className="p-2 bg-white rounded-lg border border-sky-100">
                                <strong className="text-gray-900">4. Mapa de Decisión:</strong> Vincular al Decisor Económico y al Líder Técnico incrementa la certeza de avance en el pipeline.
                              </div>
                              <div className="p-2 bg-white rounded-lg border border-sky-100">
                                <strong className="text-gray-900">5. Origen del Lead:</strong> Licitaciones formales o clientes recurrentes presentan menor fricción que prospectos en frío.
                              </div>
                              <div className="p-2 bg-white rounded-lg border border-sky-100">
                                <strong className="text-gray-900">6. Control de Inactividad:</strong> Negocios sin interacción en más de 15 o 45 días se penalizan para alertar al equipo comercial.
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Panel de Configuración Interactiva de Reglas & Factores */}
                        {isConfiguringDealScore && (
                          <div className="p-4 bg-white rounded-xl border border-gray-300 space-y-3 shadow-xs animate-in fade-in duration-150">
                            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                              <div>
                                <h5 className="font-bold text-gray-900 text-xs uppercase tracking-wide">
                                  Configuración de Criterios y Ponderación de Probabilidad
                                </h5>
                                <p className="text-[11px] text-gray-500">
                                  Personaliza los pesos porcentuales y activa o desactiva las reglas de cálculo.
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const def = resetDealScoreSettings();
                                    setDealScoreSettings(def);
                                    const recalculated = calculateDealScore(editingOpp, def);
                                    setEditingOpp({
                                      ...editingOpp,
                                      aiDealScore: recalculated.score,
                                      aiDealScoreDetails: recalculated.details,
                                      aiDealScoreFactors: recalculated.factors,
                                    });
                                    notify?.('info', 'Valores por Defecto', 'Se restablecieron las reglas originales.');
                                  }}
                                  className="flex items-center gap-1 text-[11px] font-bold text-gray-600 hover:text-gray-900 px-2 py-1 rounded bg-slate-100 cursor-pointer"
                                >
                                  <RotateCcw size={11} />
                                  <span>Restablecer</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setIsConfiguringDealScore(false)}
                                  className="text-gray-400 hover:text-gray-700 font-bold text-sm px-1 cursor-pointer"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>

                            {/* Puntaje Base */}
                            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-gray-200 text-xs">
                              <div>
                                <strong className="text-gray-900 block">Puntaje Base de Partida (%):</strong>
                                <span className="text-[10px] text-gray-500">
                                  Probabilidad inicial asignada a cualquier oportunidad antes de evaluar factores.
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={10}
                                  max={60}
                                  value={dealScoreSettings.baseScore}
                                  onChange={(e) =>
                                    setDealScoreSettings({
                                      ...dealScoreSettings,
                                      baseScore: Number(e.target.value) || 35,
                                    })
                                  }
                                  className="w-16 p-1.5 rounded-lg border border-gray-300 bg-white text-center font-bold font-mono text-xs"
                                />
                                <span className="font-bold text-gray-700">%</span>
                              </div>
                            </div>

                            {/* Lista de Reglas Configurables */}
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                              {dealScoreSettings.rules.map((rule, idx) => (
                                <div
                                  key={rule.id}
                                  className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-3 ${
                                    rule.enabled ? 'bg-slate-50/70 border-gray-200' : 'bg-gray-100/60 border-gray-200 opacity-60'
                                  }`}
                                >
                                  <div className="flex items-start gap-2.5 flex-1">
                                    <input
                                      type="checkbox"
                                      checked={rule.enabled}
                                      onChange={(e) => {
                                        const updatedRules = [...dealScoreSettings.rules];
                                        updatedRules[idx] = { ...rule, enabled: e.target.checked };
                                        setDealScoreSettings({ ...dealScoreSettings, rules: updatedRules });
                                      }}
                                      className="mt-0.5 rounded text-[#00668F] cursor-pointer"
                                    />
                                    <div>
                                      <span className="font-bold text-gray-900 block leading-tight">
                                        {rule.name}
                                      </span>
                                      <span className="text-[10px] text-gray-500 leading-normal block">
                                        {rule.description}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <span className="text-[10px] text-gray-500 font-semibold">Impacto:</span>
                                    <input
                                      type="number"
                                      disabled={!rule.enabled}
                                      value={rule.weight}
                                      onChange={(e) => {
                                        const updatedRules = [...dealScoreSettings.rules];
                                        updatedRules[idx] = { ...rule, weight: Number(e.target.value) };
                                        setDealScoreSettings({ ...dealScoreSettings, rules: updatedRules });
                                      }}
                                      className="w-14 p-1 rounded-md border border-gray-300 bg-white text-center font-bold font-mono text-xs"
                                    />
                                    <span className="font-bold text-gray-700 text-xs">%</span>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
                              <button
                                type="button"
                                onClick={() => {
                                  saveDealScoreSettings(dealScoreSettings);
                                  const recalculated = calculateDealScore(editingOpp, dealScoreSettings);
                                  setEditingOpp({
                                    ...editingOpp,
                                    aiDealScore: recalculated.score,
                                    aiDealScoreDetails: recalculated.details,
                                    aiDealScoreFactors: recalculated.factors,
                                  });
                                  setIsConfiguringDealScore(false);
                                  notify?.('success', 'Configuración Guardada', `Reglas actualizadas y aplicadas al Deal Score.`);
                                }}
                                className="px-4 py-2 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                              >
                                Guardar Criterios y Recalcular
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Formulario de Campos Principales */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Nombre del Proyecto / Licitación
                      </label>
                      <input
                        type="text"
                        required
                        value={editingOpp.title}
                        onChange={(e) => setEditingOpp({ ...editingOpp, title: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Cliente / Operador</label>
                      <input
                        type="text"
                        required
                        list="editing-contacts-datalist"
                        value={editingOpp.clientName}
                        onChange={(e) => {
                          const val = e.target.value;
                          const match = contacts.find((c) => c.company.toLowerCase() === val.toLowerCase());
                          if (match) {
                            setEditingOpp({
                              ...editingOpp,
                              clientName: match.company,
                              clientContactPerson: match.name || editingOpp.clientContactPerson,
                              clientEmail: match.email || editingOpp.clientEmail,
                              clientPhone: match.phone || editingOpp.clientPhone,
                              country: match.country || editingOpp.country,
                              cableType: match.stcSystem || editingOpp.cableType,
                            });
                          } else {
                            setEditingOpp({ ...editingOpp, clientName: val });
                          }
                        }}
                        className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F]"
                      />
                      <datalist id="editing-contacts-datalist">
                        {contacts.map((c) => (
                          <option key={c.id} value={c.company}>{c.name} ({c.country})</option>
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">País</label>
                      <input
                        type="text"
                        required
                        value={editingOpp.country}
                        onChange={(e) => setEditingOpp({ ...editingOpp, country: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F]"
                      />
                    </div>

                    <div>
                      <CreatableSelect
                        label="Tipo de Sistema STC / Cable Teleférico"
                        value={editingOpp.cableType}
                        onChange={(val) => setEditingOpp({ ...editingOpp, cableType: val })}
                        options={catalogCableTypes}
                        moduleId="crm"
                        catalogKey="cableTypes"
                        placeholder="Seleccionar o escribir tecnología STC..."
                        onOpenConfig={() => setIsConfigModalOpen(true)}
                      />
                    </div>

                    <div>
                      <CreatableSelect
                        label="Origen del Prospecto / Lead Source"
                        value={editingOpp.leadSource || ''}
                        onChange={(val) => setEditingOpp({ ...editingOpp, leadSource: val })}
                        options={catalogLeadSources}
                        moduleId="crm"
                        catalogKey="leadSources"
                        placeholder="Seleccionar o escribir origen (Licitación, Referido, etc)..."
                        onOpenConfig={() => setIsConfigModalOpen(true)}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Moneda</label>
                        <select
                          value={editingOpp.currency || 'USD'}
                          onChange={(e) => {
                            const newCurr = e.target.value as 'COP' | 'USD' | 'EUR';
                            const trm = currentTrm > 0 ? currentTrm : 4150;
                            const prevCurr = editingOpp.currency || 'USD';
                            let newVal = editingOpp.estimatedValue || editingOpp.estimatedValueUSD;
                            if (prevCurr === 'COP' && newCurr !== 'COP') {
                              newVal = Math.round(newVal / trm);
                            } else if (prevCurr !== 'COP' && newCurr === 'COP') {
                              newVal = Math.round(newVal * trm);
                            }
                            const estUSD = newCurr === 'COP' ? Math.round(newVal / trm) : newVal;
                            setEditingOpp({
                              ...editingOpp,
                              currency: newCurr,
                              estimatedValue: newVal,
                              estimatedValueUSD: estUSD,
                            });
                          }}
                          className="w-full text-xs p-2.5 rounded-xl border border-gray-300 bg-white font-bold focus:outline-hidden focus:border-[#00668F]"
                        >
                          <option value="COP">COP ($ Pesos)</option>
                          <option value="USD">USD ($ Dólares)</option>
                          <option value="EUR">EUR (€ Euros)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1 truncate">
                          <span>Valor ({editingOpp.currency || 'USD'})</span>
                        </label>
                        <input
                          type="number"
                          required
                          min={100}
                          value={editingOpp.estimatedValue ?? editingOpp.estimatedValueUSD}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            const trm = currentTrm > 0 ? currentTrm : 4150;
                            const isCop = (editingOpp.currency || 'USD') === 'COP';
                            const estUSD = isCop ? Math.round(val / trm) : val;
                            setEditingOpp({
                              ...editingOpp,
                              estimatedValue: val,
                              estimatedValueUSD: estUSD,
                            });
                          }}
                          className="w-full text-xs p-2.5 rounded-xl border border-gray-300 font-semibold focus:outline-hidden focus:border-[#00668F]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Etapa en el Pipeline</label>
                      <select
                        value={editingOpp.stage}
                        onChange={(e) => setEditingOpp({ ...editingOpp, stage: e.target.value as OpportunityStage })}
                        className="w-full text-xs p-2.5 rounded-xl border border-gray-300 bg-white focus:outline-hidden focus:border-[#00668F] font-medium"
                      >
                        {stages.map((stg) => (
                          <option key={stg.id} value={stg.id}>
                            {stg.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Fecha Estimada de Cierre</label>
                      <input
                        type="date"
                        value={editingOpp.expectedCloseDate}
                        onChange={(e) => setEditingOpp({ ...editingOpp, expectedCloseDate: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Responsable Comercial</label>
                      <input
                        type="text"
                        value={editingOpp.assignedOwnerName}
                        onChange={(e) => setEditingOpp({ ...editingOpp, assignedOwnerName: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F]"
                      />
                    </div>
                  </div>

                  {/* Persona de Contacto Principal */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200/80 space-y-2">
                    <span className="text-[11px] font-bold text-[#00668F] uppercase tracking-wide block">
                      Contacto Principal del Cliente
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">Nombre y Cargo</label>
                        <input
                          type="text"
                          placeholder="Ej: Ing. Jorge Restrepo"
                          value={editingOpp.clientContactPerson || ''}
                          onChange={(e) => setEditingOpp({ ...editingOpp, clientContactPerson: e.target.value })}
                          className="w-full text-xs p-2 rounded-lg border border-gray-300 bg-white focus:outline-hidden focus:border-[#00668F]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">Teléfono / WhatsApp</label>
                        <input
                          type="text"
                          placeholder="+57 310 123 4567"
                          value={editingOpp.clientPhone || ''}
                          onChange={(e) => setEditingOpp({ ...editingOpp, clientPhone: e.target.value })}
                          className="w-full text-xs p-2 rounded-lg border border-gray-300 bg-white focus:outline-hidden focus:border-[#00668F]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">Correo Electrónico</label>
                        <input
                          type="email"
                          placeholder="contacto@operador.com"
                          value={editingOpp.clientEmail || ''}
                          onChange={(e) => setEditingOpp({ ...editingOpp, clientEmail: e.target.value })}
                          className="w-full text-xs p-2 rounded-lg border border-gray-300 bg-white focus:outline-hidden focus:border-[#00668F]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Etiquetas / Tags */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-700">Etiquetas / Tags de Clasificación</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Escribir etiqueta (ej: Licitación, Urgente)..."
                        value={newEditTagInput}
                        onChange={(e) => setNewEditTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTagToEditingOpp();
                          }
                        }}
                        className="flex-1 text-xs p-2 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F]"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddTagToEditingOpp()}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-[#00668F] hover:text-white text-gray-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                      >
                        Añadir
                      </button>
                    </div>

                    {editingOpp.tags && editingOpp.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {editingOpp.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-[#00668F]"
                          >
                            #{tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTagFromEditingOpp(tag)}
                              className="hover:text-red-600 cursor-pointer"
                            >
                              <X size={11} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Alcance Técnico */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Alcance Técnico & Observaciones</label>
                    <textarea
                      rows={3}
                      value={editingOpp.technicalSpecs}
                      onChange={(e) => setEditingOpp({ ...editingOpp, technicalSpecs: e.target.value })}
                      placeholder="Describa el alcance de inspección, overhaul de mordazas, ensayos NDT, requisitos normativos..."
                      className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F]"
                    />
                  </div>
                </div>
              )}

              {/* ================================================================= */}
              {/* PESTAÑA 2: BITÁCORA COMERCIAL & TIMELINE */}
              {/* ================================================================= */}
              {oppModalTab === 'bitacora' && (
                <div className="space-y-4">
                  {/* Botonera de Acciones Rápidas */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-2xl border border-gray-200">
                    <span className="text-xs font-bold text-gray-700">Acciones de Gestión Directa:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenMeetingModal(editingOpp)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00668F] text-white text-xs font-bold hover:bg-[#005273] transition-colors cursor-pointer"
                      >
                        <Calendar size={13} />
                        <span>Agendar Reunión (Teams)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickOutlookEmail(editingOpp)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 text-white text-xs font-bold hover:bg-sky-700 transition-colors cursor-pointer"
                      >
                        <Mail size={13} />
                        <span>Redactar en Outlook Web</span>
                      </button>
                    </div>
                  </div>

                  {/* Formulario para registrar actividad en la bitácora */}
                  <div className="p-4 rounded-2xl border border-gray-200 bg-white space-y-3">
                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                      Registrar Nueva Interacción con el Cliente
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">Tipo de Actividad</label>
                        <select
                          value={newActivityForm.type}
                          onChange={(e) =>
                            setNewActivityForm({ ...newActivityForm, type: e.target.value as any })
                          }
                          className="w-full text-xs p-2 rounded-xl border border-gray-300 bg-white focus:outline-hidden focus:border-[#00668F]"
                        >
                          <option value="call">📞 Llamada Telefónica</option>
                          <option value="email">✉️ Correo Electrónico</option>
                          <option value="meeting">🤝 Reunión / Mesa Técnica</option>
                          <option value="document_sent">📄 Envío de Documento</option>
                          <option value="note">📝 Nota Interna</option>
                        </select>
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                          Descripción / Conclusiones del Seguimiento
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Ej: Se acordó envío de cotización preliminar para el próximo viernes..."
                            value={newActivityForm.description}
                            onChange={(e) =>
                              setNewActivityForm({ ...newActivityForm, description: e.target.value })
                            }
                            className="flex-1 text-xs p-2 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F]"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!newActivityForm.description.trim()) return;
                              const nowIso = new Date().toISOString();
                              const newAct: OpportunityActivity = {
                                id: `ACT-${Date.now()}`,
                                type: newActivityForm.type,
                                description: newActivityForm.description.trim(),
                                authorName: currentUser.name,
                                timestamp: nowIso,
                              };
                              const updatedLog = [newAct, ...(editingOpp.activityLog || [])];
                              const updatedOpp = {
                                ...editingOpp,
                                activityLog: updatedLog,
                                lastActivityAt: nowIso,
                              };
                              setEditingOpp(updatedOpp);
                              updateOpportunity(editingOpp.id, {
                                activityLog: updatedLog,
                                lastActivityAt: nowIso,
                              });
                              setNewActivityForm({ type: 'call', description: '' });
                              notify?.('success', 'Actividad Registrada', 'Se actualizó la bitácora comercial.');
                            }}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
                          >
                            Registrar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Timeline Cronológico de Actividades */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                      Historial Cronológico de Bitácora ({editingOpp.activityLog?.length || 0})
                    </span>

                    {(!editingOpp.activityLog || editingOpp.activityLog.length === 0) && (
                      <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-gray-200">
                        <History size={24} className="mx-auto text-gray-400 mb-2" />
                        <p className="text-xs font-bold text-gray-700">Sin actividades registradas</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Registra llamadas, correos o reuniones para eliminar la alerta de estancamiento.
                        </p>
                      </div>
                    )}

                    {editingOpp.activityLog &&
                      editingOpp.activityLog.map((act) => {
                        const iconMap = {
                          call: '📞',
                          email: '✉️',
                          meeting: '🤝',
                          document_sent: '📄',
                          stage_change: '🔄',
                          note: '📝',
                        };

                        const badgeMap = {
                          call: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                          email: 'bg-sky-50 text-sky-700 border-sky-200',
                          meeting: 'bg-purple-50 text-purple-700 border-purple-200',
                          document_sent: 'bg-amber-50 text-amber-700 border-amber-200',
                          stage_change: 'bg-slate-100 text-slate-700 border-slate-200',
                          note: 'bg-gray-50 text-gray-700 border-gray-200',
                        };

                        return (
                          <div
                            key={act.id}
                            className="p-3 rounded-xl bg-white border border-gray-200 shadow-2xs flex items-start justify-between gap-3 text-xs"
                          >
                            <div className="flex items-start gap-2.5">
                              <span className="text-base shrink-0">{iconMap[act.type] || '📌'}</span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wide border ${
                                      badgeMap[act.type] || 'bg-slate-50 text-gray-600'
                                    }`}
                                  >
                                    {act.type}
                                  </span>
                                  <span className="text-[10px] text-gray-400">Por {act.authorName}</span>
                                </div>
                                <p className="text-gray-800 font-medium mt-1 leading-relaxed">
                                  {act.description}
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0">
                              {new Date(act.timestamp).toLocaleDateString()} {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* ================================================================= */}
              {/* PESTAÑA 3: COTIZADOR TÉCNICO & EXPORTACIÓN PDF */}
              {/* ================================================================= */}
              {oppModalTab === 'cotizador' && (
                <div className="space-y-4">
                  {/* Selector o Creación de Cotizaciones */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-2xl border border-gray-200">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-700">Cotizaciones Disponibles:</span>
                      <div className="flex items-center gap-1">
                        {(editingOpp.quotations || []).map((q, idx) => (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => setActiveQuotationIndex(idx)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                              activeQuotationIndex === idx
                                ? 'bg-[#00668F] text-white shadow-2xs'
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-slate-100'
                            }`}
                          >
                            {q.code}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const newQuote: OpportunityQuotation = {
                          id: `COT-${Date.now()}`,
                          code: `COT-${editingOpp.code}-${(editingOpp.quotations?.length || 0) + 1}`,
                          title: `Cotización Técnica Variante: ${editingOpp.title}`,
                          items: [
                            {
                              id: `ITEM-1`,
                              description: 'Servicio de mantenimiento preventivo y verificación técnica STC',
                              qty: 1,
                              unitPrice: 20000,
                              currency: 'USD',
                            },
                          ],
                          subtotal: 20000,
                          taxRate: 0.19,
                          total: 23800,
                          validUntil: '30 días calendario',
                          paymentTerms: '50% anticipo, 50% contra entrega de informe técnico avalado',
                          createdAt: new Date().toISOString().split('T')[0],
                          incoterm: 'DDP En Sitio',
                          currency: 'USD',
                        };
                        const updatedQuotes = [...(editingOpp.quotations || []), newQuote];
                        setEditingOpp({ ...editingOpp, quotations: updatedQuotes });
                        setActiveQuotationIndex(updatedQuotes.length - 1);
                        notify?.('success', 'Nueva Cotización Creada', `Versión ${newQuote.code} lista.`);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-gray-300 hover:bg-slate-100 text-gray-700 text-xs font-bold cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Nueva Versión</span>
                    </button>
                  </div>

                  {/* Vista y Edición de la Cotización Activa */}
                  {(() => {
                    const currentQuote = (editingOpp.quotations || [])[activeQuotationIndex];
                    if (!currentQuote) return null;

                    const updateCurrentQuote = (updated: Partial<OpportunityQuotation>) => {
                      const updatedQuotes = [...(editingOpp.quotations || [])];
                      const target = { ...currentQuote, ...updated };

                      // 1. Calcular subtotal base sumando ítems con sus posibles descuentos unitarios
                      const baseSubtotal = (target.items || []).reduce((sum, it) => {
                        const price = Number(it.unitPrice) || 0;
                        const qty = Math.max(1, Number(it.qty) || 1);
                        const itDisc = Math.min(100, Math.max(0, Number(it.discountPercent) || 0));
                        return sum + (qty * price * (1 - itDisc / 100));
                      }, 0);

                      // 2. Descuento global estrictamente restringido entre 0% y 100%
                      const rawDisc = Number(target.discountPercent);
                      const discPercent = isNaN(rawDisc) ? 0 : Math.min(100, Math.max(0, rawDisc));
                      const discAmount = target.discountAmount !== undefined && updated.discountPercent === undefined
                        ? Math.min(baseSubtotal, Math.max(0, Number(target.discountAmount) || 0))
                        : baseSubtotal * (discPercent / 100);

                      const subtotalAfterDisc = Math.max(0, baseSubtotal - discAmount);

                      // 3. Costo Financiero de Capital por Términos de Pago
                      let paySurchargePct = Number(target.paymentTermSurchargePercent) || 0;
                      if (updated.paymentTermType !== undefined) {
                        if (updated.paymentTermType === 'contado') paySurchargePct = -2.0; // Descuento pronto pago
                        else if (updated.paymentTermType === 'credito_30') paySurchargePct = 2.0;
                        else if (updated.paymentTermType === 'credito_60') paySurchargePct = 4.5;
                        else if (updated.paymentTermType === 'credito_90') paySurchargePct = 7.0;
                        else if (updated.paymentTermType === 'anticipo_50_50' || updated.paymentTermType === 'contra_entrega') paySurchargePct = 0.0;
                      }
                      const paymentTermSurchargeAmount = subtotalAfterDisc * (paySurchargePct / 100);

                      // 4. Flete y Logística según Incoterm
                      let logisticsCost = Number(target.logisticsCost) || 0;
                      let incotermSurchargePercent = Number(target.incotermSurchargePercent) || 0;
                      if (updated.incotermType !== undefined) {
                        if (updated.incotermType === 'EXW') {
                          incotermSurchargePercent = 0;
                          if (updated.logisticsCost === undefined) logisticsCost = 0;
                        } else if (updated.incotermType === 'FCA' || updated.incotermType === 'FOB') {
                          incotermSurchargePercent = 2.5;
                          if (updated.logisticsCost === undefined) logisticsCost = Math.max(850, Math.round(subtotalAfterDisc * 0.025));
                        } else if (updated.incotermType === 'CPT' || updated.incotermType === 'CIP' || updated.incotermType === 'CIF') {
                          incotermSurchargePercent = 5.0;
                          if (updated.logisticsCost === undefined) logisticsCost = Math.max(2200, Math.round(subtotalAfterDisc * 0.05));
                        } else if (updated.incotermType === 'DAP' || updated.incotermType === 'DPU') {
                          incotermSurchargePercent = 7.5;
                          if (updated.logisticsCost === undefined) logisticsCost = Math.max(3500, Math.round(subtotalAfterDisc * 0.075));
                        } else if (updated.incotermType === 'DDP') {
                          incotermSurchargePercent = 10.0;
                          if (updated.logisticsCost === undefined) logisticsCost = Math.max(4800, Math.round(subtotalAfterDisc * 0.10));
                        }
                      }

                      // 5. Factores de Importación de repuestos OEM
                      const isImport = target.operationType === 'importacion';
                      const isExport = target.operationType === 'exportacion';
                      const customsDutyRate = isImport ? (Number(target.customsDutyRate) || 0.05) : 0;
                      const importFees = isImport ? (Number(target.importFees) || 0) : 0;
                      const customsDutyAmount = isImport ? (subtotalAfterDisc + logisticsCost) * customsDutyRate : 0;

                      // 6. Base Gravable para IVA
                      const baseForTax = Math.max(0, subtotalAfterDisc + paymentTermSurchargeAmount + logisticsCost + (isImport ? (customsDutyAmount + importFees) : 0));

                      // IVA: Exportación de servicios a LATAM es 0% (Exento Art. 481 lit. c E.T.)
                      let taxRate = isExport ? 0 : (typeof target.taxRate === 'number' ? target.taxRate : 0.19);
                      if (updated.operationType === 'exportacion') taxRate = 0;
                      if (updated.operationType === 'nacional' && target.taxRate === 0) taxRate = 0.19;

                      const taxAmount = baseForTax * taxRate;
                      const total = Math.max(0, baseForTax + taxAmount);

                      // 7. Proyección de Retenciones DIAN en Colombia
                      const applyReteFuente = target.applyReteFuente ?? (target.operationType === 'nacional');
                      const reteFuenteRate = Number(target.reteFuenteRate) || 0.04;
                      const reteFuenteAmount = applyReteFuente ? (subtotalAfterDisc + paymentTermSurchargeAmount) * reteFuenteRate : 0;

                      const applyReteIca = target.applyReteIca ?? (target.operationType === 'nacional');
                      const reteIcaRate = Number(target.reteIcaRate) || 0.00966;
                      const reteIcaAmount = applyReteIca ? (subtotalAfterDisc + paymentTermSurchargeAmount) * reteIcaRate : 0;

                      const netReceivable = Math.max(0, total - reteFuenteAmount - reteIcaAmount);

                      updatedQuotes[activeQuotationIndex] = {
                        ...target,
                        operationType: target.operationType || 'nacional',
                        subtotal: baseSubtotal,
                        discountPercent: discPercent,
                        discountAmount: discAmount,
                        paymentTermType: target.paymentTermType || 'anticipo_50_50',
                        paymentTermSurchargePercent: paySurchargePct,
                        paymentTermSurchargeAmount,
                        incotermType: target.incotermType || 'DDP',
                        incotermSurchargePercent,
                        logisticsCost,
                        customsDutyRate,
                        customsDutyAmount,
                        importFees,
                        taxRate,
                        taxAmount,
                        total,
                        applyReteFuente,
                        reteFuenteRate,
                        reteFuenteAmount,
                        applyReteIca,
                        reteIcaRate,
                        reteIcaAmount,
                        netReceivable,
                      };
                      setEditingOpp({ ...editingOpp, quotations: updatedQuotes });
                    };

                    const handleRefreshTRM = async () => {
                      setIsFetchingTRM(true);
                      try {
                        const res = await fetchLiveTRM();
                        if (res && res.rate) {
                          updateCurrentQuote({
                            exchangeRateTRM: res.rate,
                            trmSource: res.source,
                            trmDate: res.date,
                          });
                          notify?.('success', 'TRM Oficial Actualizada', `Tasa oficial: $${res.rate.toLocaleString('es-CO')} COP (${res.source})`);
                        }
                      } catch (e) {
                        console.error('Error actualizando TRM:', e);
                        notify?.('warning', 'Error TRM', 'No se pudo obtener la TRM en vivo.');
                      } finally {
                        setIsFetchingTRM(false);
                      }
                    };

                    const handleAnalyzeCustomsWithLuciana = async () => {
                      if (!currentQuote.items || currentQuote.items.length === 0) {
                        notify?.('warning', 'Sin Ítems', 'Agrega primero ítems para que LUC-IA-NA liquide el arancel y subpartida DIAN.');
                        return;
                      }
                      setIsAnalyzingCustoms(true);
                      try {
                        const res = await analyzeCustomsAndLogisticsWithLuciana(
                          currentQuote.items,
                          currentQuote.incoterm || 'DDP En Sitio (Colombia)',
                          editingOpp.country || 'Colombia',
                          currentQuote.currency || 'USD'
                        );
                        if (res) {
                          updateCurrentQuote({
                            customsSubheading: res.subpartidaDian,
                            customsDutyRate: res.customsDutyRate,
                            importFees: res.importFees,
                            logisticsCost: res.logisticsCost,
                            paymentTerms: res.recommendedPaymentTerms || currentQuote.paymentTerms,
                            paymentTermSurchargePercent: res.paymentTermSurchargePercent,
                            incoterm: res.recommendedIncoterm || currentQuote.incoterm,
                            customsAssistedByLuciana: true,
                            customsLucianaNotes: res.lucianaExplanation,
                          });
                          notify?.('success', 'Liquidación Aduanera LUC-IA-NA', `Subpartida ${res.subpartidaDian} aplicada con arancel ${(res.customsDutyRate * 100).toFixed(0)}%.`);
                        }
                      } catch (e) {
                        console.error('Error liquidando aduana:', e);
                        notify?.('warning', 'Error Liquidación', 'No se pudo completar el análisis aduanero.');
                      } finally {
                        setIsAnalyzingCustoms(false);
                      }
                    };

                    return (
                      <div className="space-y-4 font-['Montserrat']">
                        {/* Selector de Tipo de Operación Comercial (Multi-Escenario) */}
                        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs space-y-3">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div>
                              <span className="text-[10px] font-bold text-[#00668F] uppercase tracking-wider block">
                                Configuración del Escenario Comercial
                              </span>
                              <h4 className="text-xs font-bold text-gray-900">
                                Tipo de Operación y Régimen Tributario
                              </h4>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[11px] font-medium text-gray-500">Moneda:</span>
                              <select
                                value={currentQuote.currency || 'USD'}
                                onChange={(e) => updateCurrentQuote({ currency: e.target.value as 'USD' | 'COP' | 'EUR' })}
                                className="text-xs font-bold p-1.5 rounded-xl border border-gray-300 bg-slate-50 text-gray-800"
                              >
                                <option value="USD">USD ($ Dólar)</option>
                                <option value="COP">COP ($ Peso Col)</option>
                                <option value="EUR">EUR (€ Euro)</option>
                              </select>

                              {/* Widget TRM Oficial en Tiempo Real */}
                              <div className="flex items-center gap-1.5 bg-slate-50 border border-gray-200 px-2 py-1 rounded-xl">
                                <span className="text-[10px] font-bold text-gray-500">TRM:</span>
                                <input
                                  type="number"
                                  value={currentQuote.exchangeRateTRM || 4180}
                                  onChange={(e) => updateCurrentQuote({ exchangeRateTRM: Number(e.target.value) })}
                                  className="w-18 text-[11px] font-bold text-gray-800 bg-transparent focus:outline-hidden text-right"
                                  title="Tasa Representativa del Mercado proyectada"
                                />
                                <button
                                  type="button"
                                  disabled={isFetchingTRM}
                                  onClick={handleRefreshTRM}
                                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#00668F]/10 hover:bg-[#00668F] hover:text-white text-[#00668F] text-[10px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                                  title="Consultar TRM oficial del día en Datos Abiertos Superfinanciera / BanRep"
                                >
                                  <RefreshCw size={10} className={isFetchingTRM ? 'animate-spin' : ''} />
                                  <span>{isFetchingTRM ? 'Consultando...' : 'TRM Oficial Hoy'}</span>
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => printQuotationPdf(editingOpp, currentQuote)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00668F] hover:bg-[#005273] text-white rounded-xl text-xs font-bold shadow-xs transition-transform active:scale-95 cursor-pointer shrink-0"
                              >
                                <Printer size={14} />
                                <span>Exportar PDF</span>
                              </button>
                            </div>
                          </div>

                          {/* Badge Informativo de la TRM Oficial */}
                          {currentQuote.trmSource && (
                            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900">
                              <div className="flex items-center gap-1.5">
                                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                                <span><strong>TRM Oficial en Vivo:</strong> ${Number(currentQuote.exchangeRateTRM).toLocaleString('es-CO')} COP / USD</span>
                                <span className="text-emerald-700 font-medium">({currentQuote.trmSource})</span>
                              </div>
                              {currentQuote.trmDate && (
                                <span className="text-[10px] text-emerald-600 font-medium">Vigencia: {currentQuote.trmDate}</span>
                              )}
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                            {/* Opción 1: Venta Nacional */}
                            <button
                              type="button"
                              onClick={() => updateCurrentQuote({ operationType: 'nacional', taxRate: 0.19, incoterm: 'DDP En Sitio (Colombia)' })}
                              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                currentQuote.operationType === 'nacional'
                                  ? 'bg-[#00668F]/10 border-[#00668F] text-[#00668F]'
                                  : 'bg-slate-50/70 border-gray-200 text-gray-700 hover:bg-slate-100'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 font-bold text-xs">
                                <span>🇨🇴</span>
                                <span>Venta Nacional (Colombia)</span>
                              </div>
                              <p className="text-[11px] text-gray-500 mt-1">
                                IVA 19% pleno, fletes locales/viáticos de cuadrilla y retenciones DIAN proyectadas.
                              </p>
                            </button>

                            {/* Opción 2: Exportación de Servicios */}
                            <button
                              type="button"
                              onClick={() => updateCurrentQuote({ operationType: 'exportacion', taxRate: 0, incoterm: 'CIP Aeropuerto / DDP Destino' })}
                              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                currentQuote.operationType === 'exportacion'
                                  ? 'bg-[#00668F]/10 border-[#00668F] text-[#00668F]'
                                  : 'bg-slate-50/70 border-gray-200 text-gray-700 hover:bg-slate-100'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 font-bold text-xs">
                                <span>🌎</span>
                                <span>Exportación STC (LATAM)</span>
                              </div>
                              <p className="text-[11px] text-gray-500 mt-1">
                                IVA 0% Exento (Estatuto Tributario Art. 481 lit. c). Clientes en México, Ecuador, Bolivia.
                              </p>
                            </button>

                            {/* Opción 3: Importación de Repuestos */}
                            <button
                              type="button"
                              onClick={() => updateCurrentQuote({ operationType: 'importacion', taxRate: 0.19, incoterm: 'DDP En Sitio (Nacionalizado)', customsDutyRate: 0.05 })}
                              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                currentQuote.operationType === 'importacion'
                                  ? 'bg-[#00668F]/10 border-[#00668F] text-[#00668F]'
                                  : 'bg-slate-50/70 border-gray-200 text-gray-700 hover:bg-slate-100'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 font-bold text-xs">
                                <span>🚢</span>
                                <span>Importación & Reventa OEM</span>
                              </div>
                              <p className="text-[11px] text-gray-500 mt-1">
                                Repuestos de Europa (Doppelmayr, Poma, Fatzer). Arancel DIAN + Gastos Portuarios/SIA + Margen.
                              </p>
                            </button>
                          </div>
                        </div>

                        {/* Plantillas Rápidas para Ítems STC */}
                        <div className="flex flex-wrap items-center gap-1.5 p-2.5 rounded-xl bg-slate-50 border border-gray-200 text-xs">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mr-1">
                            Plantillas Rápidas STC ({currentQuote.currency || 'USD'}):
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const isCop = currentQuote.currency === 'COP';
                              const trm = currentQuote.exchangeRateTRM || currentTrm || 4150;
                              const item: OpportunityQuotationItem = {
                                id: `ITEM-${Date.now()}`,
                                category: 'Servicio STC',
                                description: 'Empalme mayor en cable portador-tractor con certificación EN 12927',
                                qty: 1,
                                unitPrice: isCop ? Math.round(35000 * trm) : 35000,
                                currency: currentQuote.currency || 'USD',
                                discountPercent: 0,
                              };
                              updateCurrentQuote({ items: [...(currentQuote.items || []), item] });
                            }}
                            className="px-2.5 py-1 bg-white hover:bg-slate-200 text-gray-700 font-semibold rounded-lg border border-gray-300 text-[11px] cursor-pointer"
                          >
                            + Empalme EN 12927
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const isCop = currentQuote.currency === 'COP';
                              const trm = currentQuote.exchangeRateTRM || currentTrm || 4150;
                              const item: OpportunityQuotationItem = {
                                id: `ITEM-${Date.now()}`,
                                category: 'Ensayos NDT/MRT',
                                description: 'Ensayo magneto-inductivo (MRT) de cable de acero con informe de degradación',
                                qty: 1,
                                unitPrice: isCop ? Math.round(11680 * trm) : 11680,
                                currency: currentQuote.currency || 'USD',
                                discountPercent: 0,
                              };
                              updateCurrentQuote({ items: [...(currentQuote.items || []), item] });
                            }}
                            className="px-2.5 py-1 bg-white hover:bg-slate-200 text-gray-700 font-semibold rounded-lg border border-gray-300 text-[11px] cursor-pointer"
                          >
                            + Ensayo MRT Nivel II
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const isCop = currentQuote.currency === 'COP';
                              const trm = currentQuote.exchangeRateTRM || currentTrm || 4150;
                              const item: OpportunityQuotationItem = {
                                id: `ITEM-${Date.now()}`,
                                category: 'Repuestos OEM',
                                description: 'Kit de revestimiento de goma/polímero para poleas y balancines STC',
                                qty: 16,
                                unitPrice: isCop ? Math.round(850 * trm) : 850,
                                currency: currentQuote.currency || 'USD',
                                discountPercent: 0,
                              };
                              updateCurrentQuote({ items: [...(currentQuote.items || []), item] });
                            }}
                            className="px-2.5 py-1 bg-white hover:bg-slate-200 text-gray-700 font-semibold rounded-lg border border-gray-300 text-[11px] cursor-pointer"
                          >
                            + Revestimiento Poleas OEM
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const isCop = currentQuote.currency === 'COP';
                              const trm = currentQuote.exchangeRateTRM || currentTrm || 4150;
                              const item: OpportunityQuotationItem = {
                                id: `ITEM-${Date.now()}`,
                                category: 'Viáticos & Logística',
                                description: 'Desplazamiento, hospedaje y viáticos en sitio de cuadrilla técnica (4 personas)',
                                qty: 1,
                                unitPrice: isCop ? Math.round(6000 * trm) : 6000,
                                currency: currentQuote.currency || 'USD',
                                discountPercent: 0,
                              };
                              updateCurrentQuote({ items: [...(currentQuote.items || []), item] });
                            }}
                            className="px-2.5 py-1 bg-white hover:bg-slate-200 text-gray-700 font-semibold rounded-lg border border-gray-300 text-[11px] cursor-pointer"
                          >
                            + Viáticos Cuadrilla
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const isCop = currentQuote.currency === 'COP';
                              const trm = currentQuote.exchangeRateTRM || currentTrm || 4150;
                              const item: OpportunityQuotationItem = {
                                id: `ITEM-${Date.now()}`,
                                category: 'Servicio STC',
                                description: 'Consultoría e Interventoría técnica especializada en sistemas de teleférico',
                                qty: 1,
                                unitPrice: isCop ? Math.round(4500 * trm) : 4500,
                                currency: currentQuote.currency || 'USD',
                                discountPercent: 0,
                              };
                              updateCurrentQuote({ items: [...(currentQuote.items || []), item] });
                            }}
                            className="px-2.5 py-1 bg-white hover:bg-slate-200 text-gray-700 font-semibold rounded-lg border border-gray-300 text-[11px] cursor-pointer"
                          >
                            + Interventoría STC
                          </button>
                        </div>

                        {/* Tabla de Ítems Cotizados (100% Editable en Vivo) */}
                        <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[700px]">
                              <thead>
                                <tr className="bg-slate-50 border-b border-gray-200 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                                  <th className="p-3 w-8 text-center">#</th>
                                  <th className="p-3 w-32">Categoría</th>
                                  <th className="p-3">Descripción Técnica del Servicio / Pieza</th>
                                  <th className="p-3 w-20 text-center">Cant.</th>
                                  <th className="p-3 w-32 text-right">Precio Unit.</th>
                                  <th className="p-3 w-24 text-center">Desc %</th>
                                  <th className="p-3 w-32 text-right">Subtotal</th>
                                  <th className="p-3 w-10 text-center"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 text-xs">
                                {(currentQuote.items || []).map((it, idx) => {
                                  const itQty = Math.max(1, Number(it.qty) || 1);
                                  const itPrice = Math.max(0, Number(it.unitPrice) || 0);
                                  const itDisc = Math.min(100, Math.max(0, Number(it.discountPercent) || 0));
                                  const lineSub = itQty * itPrice * (1 - itDisc / 100);

                                  return (
                                    <tr key={it.id || idx} className="hover:bg-slate-50/70 transition-colors">
                                      <td className="p-2 text-center text-gray-400 font-mono text-[11px]">{idx + 1}</td>
                                      
                                      {/* Categoría Editable */}
                                      <td className="p-2">
                                        <select
                                          value={it.category || 'Servicio STC'}
                                          onChange={(e) => {
                                            const newItems = [...(currentQuote.items || [])];
                                            newItems[idx] = { ...newItems[idx], category: e.target.value };
                                            updateCurrentQuote({ items: newItems });
                                          }}
                                          className="text-[11px] font-bold p-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 w-full focus:outline-hidden focus:border-[#00668F]"
                                        >
                                          <option value="Servicio STC">Servicio STC</option>
                                          <option value="Ensayos NDT/MRT">Ensayos NDT/MRT</option>
                                          <option value="Repuestos OEM">Repuestos OEM</option>
                                          <option value="Viáticos & Logística">Viáticos & Logística</option>
                                          <option value="Ingeniería & Peritaje">Ingeniería & Peritaje</option>
                                        </select>
                                      </td>

                                      {/* Descripción Editable */}
                                      <td className="p-2">
                                        <input
                                          type="text"
                                          value={it.description}
                                          onChange={(e) => {
                                            const newItems = [...(currentQuote.items || [])];
                                            newItems[idx] = { ...newItems[idx], description: e.target.value };
                                            updateCurrentQuote({ items: newItems });
                                          }}
                                          placeholder="Descripción del ítem..."
                                          className="w-full text-xs p-1.5 rounded-lg border border-gray-200 focus:outline-hidden focus:border-[#00668F] font-medium text-gray-900 bg-white"
                                        />
                                      </td>

                                      {/* Cantidad Editable */}
                                      <td className="p-2 text-center">
                                        <input
                                          type="number"
                                          min={1}
                                          value={it.qty}
                                          onChange={(e) => {
                                            const newItems = [...(currentQuote.items || [])];
                                            newItems[idx] = { ...newItems[idx], qty: Math.max(1, Number(e.target.value) || 1) };
                                            updateCurrentQuote({ items: newItems });
                                          }}
                                          className="w-16 text-center text-xs p-1.5 rounded-lg border border-gray-200 focus:outline-hidden focus:border-[#00668F] font-bold text-gray-900 bg-white"
                                        />
                                      </td>

                                      {/* Precio Unitario Editable */}
                                      <td className="p-2 text-right">
                                        <div className="relative">
                                          <span className="absolute left-2 top-1.5 text-[10px] text-gray-400 font-bold">$</span>
                                          <input
                                            type="number"
                                            min={0}
                                            value={it.unitPrice}
                                            onChange={(e) => {
                                              const newItems = [...(currentQuote.items || [])];
                                              newItems[idx] = { ...newItems[idx], unitPrice: Math.max(0, Number(e.target.value) || 0) };
                                              updateCurrentQuote({ items: newItems });
                                            }}
                                            className="w-28 text-right text-xs p-1.5 pl-4 rounded-lg border border-gray-200 focus:outline-hidden focus:border-[#00668F] font-bold text-gray-900 bg-white"
                                          />
                                        </div>
                                      </td>

                                      {/* Descuento por Ítem Editable */}
                                      <td className="p-2 text-center">
                                        <div className="relative inline-block">
                                          <input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={it.discountPercent ?? 0}
                                            onChange={(e) => {
                                              const newItems = [...(currentQuote.items || [])];
                                              newItems[idx] = { ...newItems[idx], discountPercent: Math.min(100, Math.max(0, Number(e.target.value) || 0)) };
                                              updateCurrentQuote({ items: newItems });
                                            }}
                                            className="w-16 text-center text-xs p-1.5 pr-4 rounded-lg border border-gray-200 focus:outline-hidden focus:border-[#00668F] font-medium text-gray-800 bg-white"
                                          />
                                          <span className="absolute right-1.5 top-1.5 text-[10px] text-gray-400 font-bold">%</span>
                                        </div>
                                      </td>

                                      {/* Subtotal Calculado */}
                                      <td className="p-2 text-right font-bold text-gray-900 whitespace-nowrap text-xs">
                                        ${Math.round(lineSub).toLocaleString()} <span className="text-[10px] text-gray-500 font-normal">{it.currency || currentQuote.currency}</span>
                                      </td>

                                      <td className="p-2 text-center">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updatedItems = currentQuote.items.filter((_, i) => i !== idx);
                                            updateCurrentQuote({ items: updatedItems });
                                          }}
                                          className="text-gray-400 hover:text-red-600 transition-colors cursor-pointer p-1"
                                          title="Eliminar ítem"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* Formulario Agregar Nuevo Ítem Rápido */}
                          <div className="p-3 bg-slate-50/80 border-t border-gray-200 flex flex-col md:flex-row items-stretch md:items-center gap-2">
                            <select
                              value={newItemCategory}
                              onChange={(e) => setNewItemCategory(e.target.value)}
                              className="text-xs p-2 rounded-xl border border-gray-300 bg-white focus:outline-hidden focus:border-[#00668F] font-semibold text-gray-700 shrink-0"
                            >
                              <option value="Servicio STC">Servicio STC</option>
                              <option value="Ensayos NDT/MRT">Ensayos NDT/MRT</option>
                              <option value="Repuestos OEM">Repuestos OEM</option>
                              <option value="Viáticos & Logística">Viáticos & Logística</option>
                              <option value="Ingeniería & Peritaje">Ingeniería & Peritaje</option>
                            </select>

                            <input
                              type="text"
                              placeholder="Descripción del servicio técnico o repuesto OEM..."
                              value={newItemDesc}
                              onChange={(e) => setNewItemDesc(e.target.value)}
                              className="flex-1 text-xs p-2 rounded-xl border border-gray-300 bg-white focus:outline-hidden focus:border-[#00668F]"
                            />

                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={1}
                                title="Cantidad"
                                placeholder="Cant"
                                value={newItemQty}
                                onChange={(e) => setNewItemQty(Math.max(1, Number(e.target.value) || 1))}
                                className="w-16 text-xs p-2 rounded-xl border border-gray-300 bg-white focus:outline-hidden focus:border-[#00668F] text-center font-bold"
                              />
                              <input
                                type="number"
                                min={0}
                                title="Precio Unitario"
                                placeholder="Precio"
                                value={newItemPrice}
                                onChange={(e) => setNewItemPrice(Math.max(0, Number(e.target.value) || 0))}
                                className="w-28 text-xs p-2 rounded-xl border border-gray-300 bg-white focus:outline-hidden focus:border-[#00668F] text-right font-bold"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (!newItemDesc.trim()) return;
                                  const newItem: OpportunityQuotationItem = {
                                    id: `ITEM-${Date.now()}`,
                                    category: newItemCategory,
                                    description: newItemDesc.trim(),
                                    qty: newItemQty,
                                    unitPrice: newItemPrice,
                                    currency: currentQuote.currency || 'USD',
                                    discountPercent: 0,
                                  };
                                  updateCurrentQuote({
                                    items: [...(currentQuote.items || []), newItem],
                                  });
                                  setNewItemDesc('');
                                  setNewItemQty(1);
                                  setNewItemPrice(15000);
                                }}
                                className="px-3 py-2 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 shadow-2xs"
                              >
                                Añadir Ítem
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Parámetros Logísticos, Aduaneros y Liquidación Económica */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Columna Izquierda: Parámetros y Condiciones Comerciales */}
                          <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-3 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-gray-700 uppercase tracking-wide text-[10px] block">
                                Condiciones Comerciales, Logísticas & Incoterms
                              </span>
                              {currentQuote.customsAssistedByLuciana && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-[#00668F] bg-[#00668F]/10 px-2 py-0.5 rounded-full">
                                  <Sparkles size={11} />
                                  <span>Asistido por LUC-IA-NA</span>
                                </span>
                              )}
                            </div>

                            {/* Descuento Global y Logística */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">
                                  Descuento Comercial Global (%)
                                </label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={currentQuote.discountPercent || 0}
                                    onChange={(e) => {
                                      const val = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                                      updateCurrentQuote({ discountPercent: val });
                                    }}
                                    className="w-full text-xs p-2 pr-6 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F] font-bold"
                                  />
                                  <span className="absolute right-2.5 top-2 text-[11px] font-bold text-gray-400">%</span>
                                </div>
                                <span className="text-[10px] text-gray-400">Rango permitido: 0% a 100%</span>
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">
                                  Flete / Viáticos de Campo ({currentQuote.currency})
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  value={currentQuote.logisticsCost || 0}
                                  onChange={(e) => updateCurrentQuote({ logisticsCost: Math.max(0, Number(e.target.value) || 0) })}
                                  className="w-full text-xs p-2 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F] font-medium"
                                />
                                <span className="text-[10px] text-gray-400">Según Incoterm acordado</span>
                              </div>
                            </div>

                            {/* Términos de Pago con Impacto Financiero */}
                            <div className="p-3 bg-slate-50 rounded-xl border border-gray-200 space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="block text-[11px] font-bold text-gray-700">
                                  Términos de Pago & Costo Financiero de Capital
                                </label>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  (currentQuote.paymentTermSurchargePercent || 0) > 0
                                    ? 'bg-amber-100 text-amber-800'
                                    : (currentQuote.paymentTermSurchargePercent || 0) < 0
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-200 text-gray-700'
                                }`}>
                                  {(currentQuote.paymentTermSurchargePercent || 0) > 0
                                    ? `+${currentQuote.paymentTermSurchargePercent}% recargo crédito`
                                    : (currentQuote.paymentTermSurchargePercent || 0) < 0
                                    ? `${currentQuote.paymentTermSurchargePercent}% descuento contado`
                                    : 'Sin recargo (0%)'}
                                </span>
                              </div>

                              <select
                                value={currentQuote.paymentTermType || 'anticipo_50_50'}
                                onChange={(e) => {
                                  const type = e.target.value as any;
                                  let paymentTermsText = currentQuote.paymentTerms;
                                  if (type === 'anticipo_50_50') paymentTermsText = '50% anticipo al ordenar, 50% contra entrega de informe técnico avalado';
                                  else if (type === 'contado') paymentTermsText = '100% anticipado / contado contra orden de compra formal';
                                  else if (type === 'credito_30') paymentTermsText = 'Crédito neto a 30 días calendario post-facturación electrónica';
                                  else if (type === 'credito_60') paymentTermsText = 'Crédito neto a 60 días calendario con radicación de factura';
                                  else if (type === 'credito_90') paymentTermsText = 'Crédito a 90 días calendario para licitación pública con acta de recibo';
                                  else if (type === 'contra_entrega') paymentTermsText = '100% contra entrega e instalación técnica a satisfacción';

                                  updateCurrentQuote({
                                    paymentTermType: type,
                                    paymentTerms: paymentTermsText,
                                  });
                                }}
                                className="w-full text-xs p-2 rounded-xl border border-gray-300 bg-white font-medium text-gray-800 focus:outline-hidden focus:border-[#00668F]"
                              >
                                <option value="anticipo_50_50">50% Anticipo + 50% Entrega (Estándar Inteckno - 0% recargo)</option>
                                <option value="contado">100% Contado / Pronto Pago (-2.0% Descuento Financiero)</option>
                                <option value="credito_30">Crédito a 30 días (+2.0% Costo Financiero de Capital)</option>
                                <option value="credito_60">Crédito a 60 días (+4.5% Costo Financiero de Capital)</option>
                                <option value="credito_90">Crédito a 90 días (+7.0% Costo Financiero Licitaciones)</option>
                                <option value="contra_entrega">100% Contra entrega a satisfacción (0% recargo)</option>
                                <option value="personalizado">Personalizado (Definir texto y recargo)</option>
                              </select>

                              <div className="grid grid-cols-4 gap-2">
                                <input
                                  type="text"
                                  value={currentQuote.paymentTerms}
                                  onChange={(e) => updateCurrentQuote({ paymentTerms: e.target.value })}
                                  placeholder="Texto de términos de pago para la cotización PDF..."
                                  className="col-span-3 text-xs p-2 rounded-xl border border-gray-300 bg-white focus:outline-hidden focus:border-[#00668F]"
                                />
                                <div className="relative">
                                  <input
                                    type="number"
                                    step={0.5}
                                    value={currentQuote.paymentTermSurchargePercent ?? 0}
                                    onChange={(e) => updateCurrentQuote({ paymentTermSurchargePercent: Number(e.target.value) || 0 })}
                                    title="Recargo o Descuento Financiero %"
                                    className="w-full text-xs p-2 pr-5 rounded-xl border border-gray-300 bg-white text-right font-bold focus:outline-hidden focus:border-[#00668F]"
                                  />
                                  <span className="absolute right-2 top-2 text-[10px] text-gray-400 font-bold">%</span>
                                </div>
                              </div>
                            </div>

                            {/* Incoterms con Impacto Logístico */}
                            <div className="p-3 bg-slate-50 rounded-xl border border-gray-200 space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="block text-[11px] font-bold text-gray-700">
                                  Incoterm Pactado & Cobertura Logística
                                </label>
                                <span className="text-[10px] text-gray-500 font-bold">Incoterms® 2020</span>
                              </div>

                              <select
                                value={currentQuote.incotermType || 'DDP'}
                                onChange={(e) => {
                                  const type = e.target.value as any;
                                  let incotermText = currentQuote.incoterm || '';
                                  if (type === 'EXW') incotermText = 'EXW Fábrica Inteckno (Medellín, Colombia)';
                                  else if (type === 'FOB') incotermText = 'FOB Puerto de Embarque / Aeropuerto Origen';
                                  else if (type === 'CIF') incotermText = 'CIF Puerto / Aeropuerto Destino (Con Seguro Marítimo/Aéreo)';
                                  else if (type === 'DAP') incotermText = 'DAP En Sitio / Estación Teleférico (Sin Desaduanar)';
                                  else if (type === 'DDP') incotermText = 'DDP En Sitio de Operación (Nacionalizado, Impuestos y Flete Incluidos)';

                                  updateCurrentQuote({
                                    incotermType: type,
                                    incoterm: incotermText,
                                  });
                                }}
                                className="w-full text-xs p-2 rounded-xl border border-gray-300 bg-white font-medium text-gray-800 focus:outline-hidden focus:border-[#00668F]"
                              >
                                <option value="DDP">DDP - Delivered Duty Paid (En Sitio con flete, seguro y aduana)</option>
                                <option value="DAP">DAP - Delivered at Place (Puesto en sitio sin desaduanar)</option>
                                <option value="CIF">CIF / CIP - Cost, Insurance & Freight (Puerto/Aeropuerto destino)</option>
                                <option value="FOB">FOB / FCA - Libre a Bordo (Puerto/Aeropuerto de origen)</option>
                                <option value="EXW">EXW - En Fábrica / Taller Inteckno Medellín (Cliente retira)</option>
                                <option value="personalizado">Incoterm Personalizado</option>
                              </select>

                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  value={currentQuote.incoterm || ''}
                                  onChange={(e) => updateCurrentQuote({ incoterm: e.target.value })}
                                  placeholder="Lugar de entrega Incoterm..."
                                  className="w-full text-xs p-2 rounded-xl border border-gray-300 bg-white focus:outline-hidden focus:border-[#00668F]"
                                />
                                <input
                                  type="text"
                                  value={currentQuote.validUntil}
                                  onChange={(e) => updateCurrentQuote({ validUntil: e.target.value })}
                                  placeholder="Vigencia (ej: 30 días)"
                                  className="w-full text-xs p-2 rounded-xl border border-gray-300 bg-white focus:outline-hidden focus:border-[#00668F]"
                                />
                              </div>
                            </div>

                            {/* Costos Aduaneros DIAN / Nacionalización con Asistencia de LUC-IA-NA */}
                            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">
                                  Costos Aduaneros DIAN & Nacionalización OEM
                                </span>
                                <button
                                  type="button"
                                  disabled={isAnalyzingCustoms}
                                  onClick={handleAnalyzeCustomsWithLuciana}
                                  className="flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-2xs cursor-pointer self-start sm:self-auto disabled:opacity-50"
                                >
                                  {isAnalyzingCustoms ? (
                                    <>
                                      <Loader2 size={12} className="animate-spin" />
                                      <span>Liquidando con LUC-IA-NA...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles size={12} />
                                      <span>LUC-IA-NA: Liquidar Arancel DIAN</span>
                                    </>
                                  )}
                                </button>
                              </div>

                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <label className="block text-[10px] font-semibold text-amber-800 mb-0.5">
                                    Subpartida DIAN
                                  </label>
                                  <input
                                    type="text"
                                    value={currentQuote.customsSubheading || '8431.39.00.00'}
                                    onChange={(e) => updateCurrentQuote({ customsSubheading: e.target.value })}
                                    placeholder="8431.39.00.00"
                                    className="w-full text-xs p-1.5 rounded-lg border border-amber-300 bg-white font-mono"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold text-amber-800 mb-0.5">
                                    Arancel DIAN (%)
                                  </label>
                                  <input
                                    type="number"
                                    step={0.01}
                                    value={Math.round((currentQuote.customsDutyRate || 0.05) * 100)}
                                    onChange={(e) => updateCurrentQuote({ customsDutyRate: Number(e.target.value) / 100 })}
                                    className="w-full text-xs p-1.5 rounded-lg border border-amber-300 bg-white font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold text-amber-800 mb-0.5">
                                    Gastos SIA / Portuario ($)
                                  </label>
                                  <input
                                    type="number"
                                    value={currentQuote.importFees || 0}
                                    onChange={(e) => updateCurrentQuote({ importFees: Math.max(0, Number(e.target.value) || 0) })}
                                    className="w-full text-xs p-1.5 rounded-lg border border-amber-300 bg-white font-bold"
                                  />
                                </div>
                              </div>

                              {currentQuote.customsLucianaNotes && (
                                <div className="p-2 bg-white rounded-lg border border-amber-200 text-[11px] text-amber-950 leading-relaxed">
                                  <strong className="text-amber-900 block font-semibold mb-0.5">Dictamen de Comercio Exterior LUC-IA-NA:</strong>
                                  {currentQuote.customsLucianaNotes}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Columna Derecha: Liquidación Financiera Exhaustiva y Proyección de Retenciones */}
                          <div className="p-4 rounded-2xl bg-slate-50 border border-gray-200 space-y-3 text-xs flex flex-col justify-between">
                            <div>
                              <span className="font-bold text-gray-700 uppercase tracking-wide text-[10px] block mb-2">
                                Liquidación Económica & Impuestos
                              </span>

                              <div className="space-y-1.5 border-b border-gray-200 pb-3">
                                <div className="flex justify-between text-gray-600">
                                  <span>Subtotal Bruto Ítems:</span>
                                  <span className="font-medium text-gray-800">
                                    ${Math.round(currentQuote.subtotal || 0).toLocaleString()} {currentQuote.currency}
                                  </span>
                                </div>

                                {(currentQuote.discountAmount || 0) > 0 && (
                                  <div className="flex justify-between text-emerald-600 font-medium">
                                    <span>(-) Descuento Comercial ({currentQuote.discountPercent}%):</span>
                                    <span>
                                      -${Math.round(currentQuote.discountAmount || 0).toLocaleString()} {currentQuote.currency}
                                    </span>
                                  </div>
                                )}

                                {(currentQuote.paymentTermSurchargeAmount || 0) !== 0 && (
                                  <div className={`flex justify-between font-medium ${
                                    (currentQuote.paymentTermSurchargeAmount || 0) > 0 ? 'text-amber-700' : 'text-emerald-700'
                                  }`}>
                                    <span>
                                      {(currentQuote.paymentTermSurchargeAmount || 0) > 0 ? '(+) Costo Financiero Crédito' : '(-) Descuento Pronto Pago'} ({currentQuote.paymentTermSurchargePercent}%):
                                    </span>
                                    <span>
                                      {(currentQuote.paymentTermSurchargeAmount || 0) > 0 ? '+' : '-'}${Math.abs(Math.round(currentQuote.paymentTermSurchargeAmount || 0)).toLocaleString()} {currentQuote.currency}
                                    </span>
                                  </div>
                                )}

                                {(currentQuote.logisticsCost || 0) > 0 && (
                                  <div className="flex justify-between text-gray-600">
                                    <span>(+) Logística y Viáticos ({currentQuote.incoterm || 'DDP'}):</span>
                                    <span className="font-medium text-gray-800">
                                      +${Math.round(currentQuote.logisticsCost || 0).toLocaleString()} {currentQuote.currency}
                                    </span>
                                  </div>
                                )}

                                {currentQuote.operationType === 'importacion' && (
                                  <>
                                    <div className="flex justify-between text-gray-600">
                                      <span>(+) Arancel Aduanero DIAN ({((currentQuote.customsDutyRate || 0.05) * 100).toFixed(0)}%):</span>
                                      <span className="font-medium text-gray-800">
                                        +${Math.round(currentQuote.customsDutyAmount || 0).toLocaleString()} {currentQuote.currency}
                                      </span>
                                    </div>
                                    {(currentQuote.importFees || 0) > 0 && (
                                      <div className="flex justify-between text-gray-600">
                                        <span>(+) Gastos de Agenciamiento SIA / Puerto:</span>
                                        <span className="font-medium text-gray-800">
                                          +${Math.round(currentQuote.importFees || 0).toLocaleString()} {currentQuote.currency}
                                        </span>
                                      </div>
                                    )}
                                  </>
                                )}

                                <div className="flex justify-between items-center text-gray-600 pt-1">
                                  <span className="flex items-center gap-1">
                                    <span>IVA:</span>
                                    <select
                                      value={currentQuote.taxRate ?? 0.19}
                                      onChange={(e) => updateCurrentQuote({ taxRate: Number(e.target.value) })}
                                      className="text-[11px] p-0.5 rounded border border-gray-300 bg-white font-medium"
                                    >
                                      <option value={0.19}>19% (Pleno Colombia)</option>
                                      <option value={0}>0% (Exento Exportación E.T. Art 481)</option>
                                    </select>
                                  </span>
                                  <span className="font-medium text-gray-800">
                                    ${Math.round(currentQuote.taxAmount || 0).toLocaleString()} {currentQuote.currency}
                                  </span>
                                </div>
                              </div>

                              {/* Gran Total Facturado */}
                              <div className="pt-2.5 space-y-1">
                                <div className="flex justify-between items-center">
                                  <span className="font-bold text-gray-900 text-xs uppercase tracking-wide">
                                    VALOR TOTAL FACTURADO:
                                  </span>
                                  <span className="text-base font-extrabold text-[#00668F]">
                                    ${Math.round(currentQuote.total || 0).toLocaleString()} {currentQuote.currency}
                                  </span>
                                </div>

                                {currentQuote.currency !== 'COP' && currentQuote.exchangeRateTRM && (
                                  <div className="flex justify-between items-center text-[11px] text-gray-500 pt-1 border-t border-dashed border-gray-200">
                                    <span>Equivalente en Pesos Col (TRM ${Number(currentQuote.exchangeRateTRM).toLocaleString('es-CO')}):</span>
                                    <span className="font-bold text-[#00668F]">
                                      ${Math.round((currentQuote.total || 0) * currentQuote.exchangeRateTRM).toLocaleString('es-CO')} COP
                                    </span>
                                  </div>
                                )}

                                <div className="pt-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const quoteTotal = Math.round(currentQuote.total || 0);
                                      const qCurr = currentQuote.currency || 'COP';
                                      const trm = currentTrm || 4150;
                                      const valUSD = qCurr === 'COP' ? Math.round(quoteTotal / trm) : quoteTotal;
                                      setEditingOpp((prev) => prev ? {
                                        ...prev,
                                        currency: qCurr,
                                        estimatedValue: quoteTotal,
                                        estimatedValueUSD: valUSD
                                      } : prev);
                                      notify?.('success', 'Valor Sincronizado', `La oportunidad se actualizó a ${quoteTotal.toLocaleString()} ${qCurr} según el total cotizado.`);
                                    }}
                                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
                                    title="Sincronizar el valor de la oportunidad con el total calculado en esta cotización"
                                  >
                                    <ArrowRightLeft size={13} />
                                    <span>Sincronizar Total Cotizado con la Oportunidad</span>
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Proyección de Flujo Neto en Banco (Retenciones DIAN Colombia) */}
                            {currentQuote.operationType !== 'exportacion' && (
                              <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-2 text-[11px]">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-gray-700 uppercase text-[10px] tracking-wide">
                                    Proyección de Retenciones DIAN (Caja Real)
                                  </span>
                                  <span className="text-[10px] text-gray-400">Colombia</span>
                                </div>

                                <div className="flex items-center justify-between text-gray-600">
                                  <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={currentQuote.applyReteFuente !== false}
                                      onChange={(e) => updateCurrentQuote({ applyReteFuente: e.target.checked })}
                                      className="rounded text-[#00668F]"
                                    />
                                    <span>ReteFuente (4% Serv. Técnicos)</span>
                                  </label>
                                  <span className="font-medium text-rose-600">
                                    -${Math.round(currentQuote.applyReteFuente !== false ? (currentQuote.reteFuenteAmount || 0) : 0).toLocaleString()} {currentQuote.currency}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-gray-600">
                                  <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={currentQuote.applyReteIca !== false}
                                      onChange={(e) => updateCurrentQuote({ applyReteIca: e.target.checked })}
                                      className="rounded text-[#00668F]"
                                    />
                                    <span>ReteICA (9.66‰ Actividad Técnica)</span>
                                  </label>
                                  <span className="font-medium text-rose-600">
                                    -${Math.round(currentQuote.applyReteIca !== false ? (currentQuote.reteIcaAmount || 0) : 0).toLocaleString()} {currentQuote.currency}
                                  </span>
                                </div>

                                <div className="pt-2 border-t border-dashed border-gray-200 flex justify-between font-bold text-gray-900">
                                  <span>Neto Proyectado a Recibir en Banco:</span>
                                  <span className="text-emerald-700">
                                    ${Math.round(currentQuote.netReceivable || currentQuote.total).toLocaleString()} {currentQuote.currency}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ================================================================= */}
              {/* PESTAÑA 4: PLIEGOS LICITACIÓN & IA (SECOP / COMPRANET) */}
              {/* ================================================================= */}
              {oppModalTab === 'pliegos' && (
                <div className="space-y-4">
                  {/* Cuadro de Carga o Pegado de Pliegos */}
                  <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCheck size={16} className="text-[#00668F]" />
                        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                          Analizador de Pliegos de Licitación Pública
                        </h4>
                      </div>
                      <span className="text-[10px] text-gray-500 font-medium">
                        SECOP II • CompraNet • Sercop • Mercado Público
                      </span>
                    </div>

                    <p className="text-xs text-gray-600">
                      Pega a continuación el objeto contractual, requisitos técnicos o pliego de condiciones. LUC-IA-NA
                      extraerá los habilitantes y verificará si Inteckno cumple con los requisitos normativos y de experiencia.
                    </p>

                    <textarea
                      rows={4}
                      placeholder="Pega aquí los términos de referencia, pliego de condiciones o requisitos técnicos..."
                      value={pliegoInputText}
                      onChange={(e) => setPliegoInputText(e.target.value)}
                      className="w-full text-xs p-3 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F] font-mono"
                    />

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <FileText size={14} className="text-gray-400" />
                        <span>Documento: {pliegoFileName}</span>
                      </div>

                      <button
                        type="button"
                        disabled={isAnalyzingPliego}
                        onClick={async () => {
                          setIsAnalyzingPliego(true);
                          try {
                            const result = await analyzeBiddingPliego(
                              pliegoFileName,
                              pliegoInputText || editingOpp.technicalSpecs || editingOpp.title,
                              editingOpp
                            );
                            setEditingOpp({
                              ...editingOpp,
                              pliegoAnalysis: result,
                              pliegoRawText: pliegoInputText,
                            });
                            notify?.('success', 'Pliego Analizado', `Veredicto de cumplimiento: ${result.intecknoFitVerdict.toUpperCase()}`);
                          } catch (err) {
                            console.error('Error analizando pliego:', err);
                          } finally {
                            setIsAnalyzingPliego(false);
                          }
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                      >
                        {isAnalyzingPliego ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Analizando Pliego con LUC-IA-NA...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={14} className="text-amber-300" />
                            <span>Ejecutar Análisis con LUC-IA-NA</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Resultados del Análisis de Licitación */}
                  {editingOpp.pliegoAnalysis && (
                    <div className="space-y-4">
                      {/* Veredicto de Cumplimiento */}
                      <div
                        className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                          editingOpp.pliegoAnalysis.intecknoFitVerdict === 'cumple'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : editingOpp.pliegoAnalysis.intecknoFitVerdict === 'parcial'
                            ? 'bg-amber-50 border-amber-200 text-amber-900'
                            : 'bg-rose-50 border-rose-200 text-rose-900'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 font-bold ${
                              editingOpp.pliegoAnalysis.intecknoFitVerdict === 'cumple'
                                ? 'bg-emerald-600'
                                : editingOpp.pliegoAnalysis.intecknoFitVerdict === 'parcial'
                                ? 'bg-amber-500'
                                : 'bg-rose-600'
                            }`}
                          >
                            <ShieldCheck size={20} />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider block">
                              Veredicto de Cumplimiento Inteckno
                            </span>
                            <h4 className="text-sm font-bold">
                              {editingOpp.pliegoAnalysis.intecknoFitVerdict === 'cumple'
                                ? 'INTECKNO CUMPLE CON EL 100% DE LOS REQUISITOS HABILITANTES'
                                : editingOpp.pliegoAnalysis.intecknoFitVerdict === 'parcial'
                                ? 'CUMPLIMIENTO PARCIAL - REQUIERE ASOCIACIÓN O AJUSTE DE CERTIFICACIONES'
                                : 'ALERTA: INTECKNO NO CUMPLE CONDICIONES TÉCNICAS O LEGALES EXIGIDAS'}
                            </h4>
                          </div>
                        </div>

                        <span className="text-xs font-mono font-bold text-gray-600 shrink-0">
                          Analizado: {editingOpp.pliegoAnalysis.analyzedAt}
                        </span>
                      </div>

                      {/* Resumen del Alcance y Presupuesto Oficial */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-1.5 text-xs">
                          <span className="font-bold text-[#00668F] uppercase text-[10px] tracking-wide block">
                            Objeto & Alcance Técnico Licitado
                          </span>
                          <p className="text-gray-800 font-medium leading-relaxed">
                            {editingOpp.pliegoAnalysis.summary}
                          </p>
                          {editingOpp.pliegoAnalysis.extractedScope && (
                            <p className="text-gray-600 text-[11px] pt-1 border-t border-gray-100">
                              {editingOpp.pliegoAnalysis.extractedScope}
                            </p>
                          )}
                        </div>

                        <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-2 text-xs">
                          <span className="font-bold text-[#00668F] uppercase text-[10px] tracking-wide block">
                            Presupuesto Oficial Estimado
                          </span>
                          <p className="text-lg font-bold text-gray-900 font-mono">
                            {editingOpp.pliegoAnalysis.budget}
                          </p>

                          <span className="font-bold text-gray-500 uppercase text-[10px] tracking-wide block pt-1">
                            Cronograma de Hitos Clave del Proceso
                          </span>
                          <div className="space-y-1">
                            {editingOpp.pliegoAnalysis.keyDates.map((kd, idx) => (
                              <div key={idx} className="flex justify-between text-[11px]">
                                <span className="text-gray-600">{kd.label}:</span>
                                <span className="font-bold text-gray-900 font-mono">{kd.date}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Requisitos Habilitantes Verificados */}
                      <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-2">
                        <span className="font-bold text-gray-800 uppercase text-[10px] tracking-wide block">
                          Requisitos Habilitantes y Certificaciones Exigidas
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {editingOpp.pliegoAnalysis.requirements.map((req, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 rounded-xl bg-slate-50 border border-gray-200 text-xs flex items-start gap-2 text-gray-800 font-medium"
                            >
                              <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                              <span>{req}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ================================================================= */}
              {/* PESTAÑA 5: COMITÉ DE DECISIÓN DEL CLIENTE (BUYING CENTER) */}
              {/* ================================================================= */}
              {oppModalTab === 'stakeholders' && (
                <div className="space-y-4 font-['Montserrat']">
                  {/* Tarjeta Educativa y Aclaratoria Fundamental */}
                  <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl space-y-2.5">
                    <div className="flex items-center gap-2 text-[#00668F] font-bold text-xs uppercase tracking-wide">
                      <Info size={16} className="shrink-0" />
                      <span>¿Por qué este mapa vincula contactos de tu CLIENTE ({editingOpp.clientName}) y NO gente de Inteckno?</span>
                    </div>
                    <p className="text-xs text-sky-950 leading-relaxed">
                      En contratos de ingeniería y mantenimiento de teleféricos (Metro de Medellín, Mi Teleférico La Paz, TransMiCable, Doppelmayr, Leitner), <strong>la decisión de compra NUNCA depende de una sola persona</strong>. Inteckno no le vende a un logotipo o edificio: le vende a un <strong>Comité de Decisión (Buying Center)</strong> dentro de la organización del cliente.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                      <div className="p-2.5 rounded-xl bg-white border border-sky-100 shadow-2xs">
                        <strong className="text-gray-900 block font-bold">👑 Decisor Económico</strong>
                        <span className="text-gray-600">Gerente General o Director Financiero del cliente. Autoriza la partida presupuestal y estampa la firma del contrato.</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white border border-sky-100 shadow-2xs">
                        <strong className="text-gray-900 block font-bold">⚙️ Evaluador Técnico</strong>
                        <span className="text-gray-600">Jefe de Mantenimiento STC del cliente. Revisa cumplimiento de norma EN 12927, certificados MRT y calibración.</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white border border-sky-100 shadow-2xs">
                        <strong className="text-gray-900 block font-bold">💼 Compras & Licitaciones</strong>
                        <span className="text-gray-600">Director de Adquisiciones del cliente. Negocia Incoterms DDP, pólizas de seguro, garantías y términos de pago.</span>
                      </div>
                    </div>
                  </div>

                  {/* Banner de Diagnóstico de Cobertura del Comité */}
                  {(() => {
                    const shList = editingOpp.stakeholders || [];
                    const hasDecisor = shList.some((s) => s.role.toLowerCase().includes('decisor') || s.role.toLowerCase().includes('gerente'));
                    const hasTecnico = shList.some((s) => s.role.toLowerCase().includes('téc') || s.role.toLowerCase().includes('tec') || s.role.toLowerCase().includes('ingenier') || s.role.toLowerCase().includes('mantenimiento'));
                    const hasComprador = shList.some((s) => s.role.toLowerCase().includes('compra') || s.role.toLowerCase().includes('licita') || s.role.toLowerCase().includes('adquisic') || s.role.toLowerCase().includes('intervent'));

                    const health = (hasDecisor && hasTecnico && hasComprador)
                      ? {
                          status: 'optimal',
                          label: 'Cobertura Completa del Comité del Cliente',
                          desc: `Tienes identificados al Decisor Económico, al Evaluador Técnico y al área de Compras de ${editingOpp.clientName}. Tu propuesta tiene la máxima probabilidad de blindar la adjudicación.`,
                          color: 'bg-emerald-50 border-emerald-200 text-emerald-900',
                          badge: 'bg-emerald-100 text-emerald-800',
                        }
                      : (hasDecisor || (hasTecnico && hasComprador))
                      ? {
                          status: 'warning',
                          label: 'Cobertura Parcial del Comité del Cliente',
                          desc: `Falta mapear al menos un rol clave en ${editingOpp.clientName} (Decisor Económico o Compras). Existe riesgo de que la propuesta técnica se estanque sin patrocinador financiero.`,
                          color: 'bg-amber-50 border-amber-200 text-amber-900',
                          badge: 'bg-amber-100 text-amber-800',
                        }
                      : {
                          status: 'danger',
                          label: 'Riesgo Comercial Alto: Sin Tomadores de Decisión del Cliente',
                          desc: `No has vinculado interlocutores clave de ${editingOpp.clientName}. En proyectos STC, las propuestas sin relacionamiento directo con los tomadores de decisión tienen una tasa de pérdida superior al 80%.`,
                          color: 'bg-rose-50 border-rose-200 text-rose-900',
                          badge: 'bg-rose-100 text-rose-800',
                        };

                    return (
                      <div className={`p-4 rounded-2xl border ${health.color} space-y-2`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${health.badge}`}>
                              {health.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-semibold">
                            <span className={hasDecisor ? 'text-emerald-700' : 'text-gray-400'}>
                              👑 Decisor {hasDecisor ? '✓' : '✗'}
                            </span>
                            <span>•</span>
                            <span className={hasTecnico ? 'text-emerald-700' : 'text-gray-400'}>
                              ⚙️ Evaluador Técnico {hasTecnico ? '✓' : '✗'}
                            </span>
                            <span>•</span>
                            <span className={hasComprador ? 'text-emerald-700' : 'text-gray-400'}>
                              💼 Compras / Interventoría {hasComprador ? '✓' : '✗'}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs leading-relaxed">{health.desc}</p>
                      </div>
                    );
                  })()}

                  {/* Formulario de Vinculación de Actores Clave del Cliente */}
                  <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                        Vincular Contacto del Cliente ({editingOpp.clientName})
                      </h4>
                      <span className="text-[10px] text-gray-400 font-medium">Directorio de Contactos</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Selecciona un contacto perteneciente a la empresa cliente y asígnale su rol de influencia en el proceso de compra.
                    </p>

                    {(() => {
                      const clientFilter = (editingOpp.clientName || '').toLowerCase().trim();
                      const clientContacts = contacts.filter((c) =>
                        clientFilter && (c.company.toLowerCase().includes(clientFilter) || clientFilter.includes(c.company.toLowerCase()))
                      );
                      const otherContacts = contacts.filter((c) => !clientContacts.includes(c));

                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                              Contacto del Directorio (Prioridad: {editingOpp.clientName})
                            </label>
                            <select
                              value={selectedContactIdForStakeholder}
                              onChange={(e) => setSelectedContactIdForStakeholder(e.target.value)}
                              className="w-full text-xs p-2 rounded-xl border border-gray-300 bg-white focus:outline-hidden focus:border-[#00668F]"
                            >
                              <option value="">Seleccionar contacto del cliente...</option>
                              {clientContacts.length > 0 && (
                                <optgroup label={`Contactos de ${editingOpp.clientName}`}>
                                  {clientContacts.map((cnt) => (
                                    <option key={cnt.id} value={cnt.id}>
                                      ⭐ {cnt.name} - {cnt.role} ({cnt.company})
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                              <optgroup label="Otros Contactos del Directorio">
                                {otherContacts.map((cnt) => (
                                  <option key={cnt.id} value={cnt.id}>
                                    {cnt.name} - {cnt.company} ({cnt.role})
                                  </option>
                                ))}
                              </optgroup>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                              Rol en el Comité del Cliente
                            </label>
                            <select
                              value={stakeholderRole}
                              onChange={(e) => setStakeholderRole(e.target.value)}
                              className="w-full text-xs p-2 rounded-xl border border-gray-300 bg-white focus:outline-hidden focus:border-[#00668F]"
                            >
                              <option value="👑 Decisor Económico (Gerente / Finanzas)">👑 Decisor Económico (Gerente / Finanzas)</option>
                              <option value="⚙️ Evaluador Técnico (Jefe STC / Mantenimiento)">⚙️ Evaluador Técnico (Jefe STC / Mantenimiento)</option>
                              <option value="💼 Comprador (Licitaciones / Adquisiciones)">💼 Comprador (Licitaciones / Adquisiciones)</option>
                              <option value="🌟 Campeón Interno (Aliado que apoya a Inteckno)">🌟 Campeón Interno (Aliado que apoya a Inteckno)</option>
                              <option value="🔍 Interventor / Auditor Externo">🔍 Interventor / Auditor Externo</option>
                              <option value="🚠 Operaciones de Campo (Jefe de Estación)">🚠 Operaciones de Campo (Jefe de Estación)</option>
                              <option value="⚠️ Detractor / Reticente (Preferencia por OEM)">⚠️ Detractor / Reticente (Preferencia por OEM)</option>
                            </select>
                          </div>

                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() => {
                                const cnt = contacts.find((c) => c.id === selectedContactIdForStakeholder);
                                if (!cnt) {
                                  notify?.('warning', 'Selecciona un Contacto', 'Elige un contacto del cliente para vincular.');
                                  return;
                                }
                                const newStakeholder: OpportunityStakeholder = {
                                  contactId: cnt.id,
                                  name: cnt.name,
                                  role: stakeholderRole,
                                  email: cnt.email,
                                  phone: cnt.phone,
                                  notes: stakeholderNotes || `Contacto de ${cnt.company} (${cnt.role}) vinculado al comité de compra como ${stakeholderRole}`,
                                };
                                const updatedStakeholders = [...(editingOpp.stakeholders || []), newStakeholder];
                                setEditingOpp({ ...editingOpp, stakeholders: updatedStakeholders });
                                setSelectedContactIdForStakeholder('');
                                setStakeholderNotes('');
                                notify?.('success', 'Contacto Vinculado al Comité', `${cnt.name} registrado como ${stakeholderRole}.`);
                              }}
                              className="w-full px-4 py-2 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-2xs"
                            >
                              Vincular al Comité
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Lista de Stakeholders Vinculados */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                      Miembros del Comité del Cliente Vinculados ({editingOpp.stakeholders?.length || 0})
                    </span>

                    {(!editingOpp.stakeholders || editingOpp.stakeholders.length === 0) && (
                      <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-gray-200">
                        <Users size={24} className="mx-auto text-gray-400 mb-2" />
                        <p className="text-xs font-bold text-gray-700">Sin comité de decisión mapeado para {editingOpp.clientName}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Vincula al menos al Gerente/Decisor Económico y al Ingeniero de Mantenimiento de cables para asegurar el cierre de la oportunidad.
                        </p>
                      </div>
                    )}

                    {editingOpp.stakeholders &&
                      editingOpp.stakeholders.map((sh, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-2xl bg-white border border-gray-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[#00668F] aspect-square shrink-0">
                              {sh.name.charAt(0)}
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-gray-900">{sh.name}</span>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#00668F]/10 text-[#00668F]">
                                  {sh.role}
                                </span>
                              </div>
                              <p className="text-gray-500 text-[11px] mt-0.5">
                                {sh.email || 'Sin correo registrado'} • {sh.phone || 'Sin teléfono'}
                              </p>
                              {sh.notes && (
                                <p className="text-[10px] text-gray-600 mt-0.5 italic">
                                  {sh.notes}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 self-end sm:self-center">
                            {sh.phone && (
                              <button
                                type="button"
                                onClick={() => handleQuickCall(editingOpp)}
                                className="p-2 rounded-xl bg-slate-100 hover:bg-[#00668F] hover:text-white text-gray-700 transition-colors cursor-pointer"
                                title="Registrar llamada comercial"
                              >
                                <Phone size={13} />
                              </button>
                            )}

                            {sh.phone && (
                              <button
                                type="button"
                                onClick={() => {
                                  const clean = sh.phone!.replace(/\D/g, '');
                                  window.open(`https://wa.me/${clean}?text=${encodeURIComponent(`Hola ${sh.name}, le saludo cordialmente desde INTECKNO S.A.S. en relación al proyecto ${editingOpp.code} - ${editingOpp.title}.`)}`, '_blank');
                                }}
                                className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 transition-colors cursor-pointer"
                                title="Enviar mensaje por WhatsApp Web"
                              >
                                <MessageSquare size={13} />
                              </button>
                            )}

                            {sh.email && (
                              <button
                                type="button"
                                onClick={() =>
                                  openOutlookWebCompose(
                                    sh.email!,
                                    `[${editingOpp.code}] ${editingOpp.title} - Inteckno S.A.S.`,
                                    `Estimado(a) ${sh.name},\n\nLe contactamos cordialmente desde Inteckno S.A.S. para presentar avances y coordinar la propuesta técnica y económica referente a ${editingOpp.title}.\n\nQuedamos a su entera disposición para cualquier aclaración o mesa técnica de trabajo.\n\nCordialmente,\n${currentUser.name}\n${currentUser.roleLabel || 'Ingeniería Comercial STC'}\nINTECKNO S.A.S.`
                                  )
                                }
                                className="p-2 rounded-xl bg-sky-50 hover:bg-sky-600 hover:text-white text-sky-700 transition-colors cursor-pointer"
                                title="Redactar correo en Outlook Web"
                              >
                                <Mail size={13} />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                const updated = editingOpp.stakeholders?.filter((_, i) => i !== idx);
                                setEditingOpp({ ...editingOpp, stakeholders: updated });
                              }}
                              className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Desvincular del Comité"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Resumen Metodológico B2B MEDDPICC / Miller Heiman */}
                  <div className="p-4 bg-slate-50 border border-gray-200 rounded-2xl space-y-2 text-xs text-gray-600">
                    <span className="font-bold text-gray-800 uppercase text-[10px] tracking-wide block">
                      Metodología B2B: Gestión del Buying Center en Teleféricos
                    </span>
                    <p className="leading-relaxed text-[11px]">
                      Para asegurar la adjudicación en licitaciones o contratos privados STC, el equipo de ventas de Inteckno debe alinear la propuesta con los dolores específicos de cada miembro del cliente:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-[11px]">
                      <li>Al <strong>Evaluador Técnico</strong> se le entregan los informes de calibración de los equipos magneto-inductivos (MRT) y la calificación EN 12927 de los empalmadores.</li>
                      <li>Al <strong>Comprador</strong> se le garantiza el Incoterm DDP en sitio de estación y pólizas de cumplimiento expedidas por aseguradoras de primer nivel.</li>
                      <li>Al <strong>Decisor Económico</strong> se le presenta el análisis de retorno de inversión, prevención de paradas no programadas y disponibilidad operativa del teleférico.</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* ================================================================= */}
              {/* PESTAÑA 6: PROPUESTA COMERCIAL EJECUTIVA (B2B NEGOCIADOR) */}
              {/* ================================================================= */}
              {oppModalTab === 'propuesta' && (
                <div className="space-y-4 font-['Montserrat']">
                  <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-3 shadow-2xs">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Send size={16} className="text-[#00668F]" />
                          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                            Redacción de Propuesta Comercial Ejecutiva
                          </h4>
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5">
                          Genera una carta formal de oferta técnico-económica en primera persona, redactada directamente
                          con los estándares normativos EN 12927 y condiciones de Inteckno S.A.S. lista para enviar por Outlook.
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={isGeneratingProposal}
                        onClick={async () => {
                          setIsGeneratingProposal(true);
                          try {
                            const quote = (editingOpp.quotations || [])[0];
                            const draft = await generateCommercialProposalDraft(editingOpp, currentUser, quote);
                            setProposalSubject(draft.subject);
                            setProposalBody(draft.body);
                            notify?.('success', 'Propuesta Generada', 'Carta comercial ejecutiva redactada con éxito.');
                          } catch (err) {
                            console.error('Error generando propuesta:', err);
                          } finally {
                            setIsGeneratingProposal(false);
                          }
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0 disabled:opacity-60"
                      >
                        {isGeneratingProposal ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Redactando carta ejecutiva...</span>
                          </>
                        ) : (
                          <>
                            <Send size={14} />
                            <span>Redactar Propuesta Ejecutiva</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Asunto del Correo */}
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                        Asunto de la Propuesta / Carta de Presentación
                      </label>
                      <input
                        type="text"
                        value={proposalSubject}
                        onChange={(e) => setProposalSubject(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F]"
                      />
                    </div>

                    {/* Cuerpo de la Carta de Propuesta */}
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                        Cuerpo Oficial de la Oferta Comercial (Negociador Inteckno)
                      </label>
                      <textarea
                        rows={12}
                        value={proposalBody}
                        onChange={(e) => setProposalBody(e.target.value)}
                        placeholder="Haz clic en 'Redactar Propuesta Ejecutiva' para redactar el borrador formal con los datos de esta oportunidad y cotización..."
                        className="w-full text-xs p-3 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F] font-mono leading-relaxed"
                      />
                    </div>

                    {/* Botonera de Envío y Copia */}
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => {
                          if (!proposalBody) return;
                          navigator.clipboard.writeText(`${proposalSubject}\n\n${proposalBody}`);
                          setProposalCopied(true);
                          setTimeout(() => setProposalCopied(false), 3000);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                      >
                        {proposalCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                        <span>{proposalCopied ? '¡Copiado!' : 'Copiar al Portapapeles'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          openOutlookWebCompose(
                            editingOpp.clientEmail || '',
                            proposalSubject || `[${editingOpp.code}] Propuesta Comercial Inteckno S.A.S.`,
                            proposalBody
                          );
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                      >
                        <Mail size={14} />
                        <span>Redactar en Outlook Web</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pie Fijo Siempre Visible */}
            <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-t border-gray-200 shrink-0">
              <span className="text-[11px] text-gray-500 font-medium">
                Última gestión: {editingOpp.lastActivityAt ? new Date(editingOpp.lastActivityAt).toLocaleDateString() : 'Sin bitácora'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingOpp(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200/70 rounded-xl cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Auto-sincronizar valor con cotización activa si tiene ítems y total válido
                    const activeQuote = (editingOpp.quotations || [])[activeQuotationIndex] || editingOpp.quotations?.[0];
                    let finalOpp = { ...editingOpp };
                    if (activeQuote && (activeQuote.items?.length ?? 0) > 0 && (activeQuote.total || 0) > 0) {
                      const qTotal = Math.round(activeQuote.total);
                      const qCurr = activeQuote.currency || finalOpp.currency || 'COP';
                      finalOpp.currency = qCurr;
                      finalOpp.estimatedValue = qTotal;
                      const trm = currentTrm || 4150;
                      finalOpp.estimatedValueUSD = qCurr === 'COP' ? Math.round(qTotal / trm) : qTotal;
                    }
                    updateOpportunity(finalOpp.id, finalOpp);
                    notify?.('success', 'Oportunidad Guardada', `Cambios en ${finalOpp.code} aplicados con éxito.`);
                    setEditingOpp(null);
                  }}
                  className="px-5 py-2 text-xs font-bold bg-[#00668F] text-white rounded-xl shadow-xs hover:bg-[#005273] cursor-pointer"
                >
                  Guardar Todos los Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL PARA AGENDAR REUNIÓN COMERCIAL (CALENDARIO & TEAMS) */}
      {/* ========================================================================= */}
      {isScheduleMeetingModalOpen && selectedOppForMeeting && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-200">
            <div className="bg-[#00668F] text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar size={18} />
                <h3 className="text-sm font-bold">Agendar Reunión Comercial</h3>
              </div>
              <button
                onClick={() => setIsScheduleMeetingModalOpen(false)}
                className="text-white/80 hover:text-white font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Título de la Sesión</label>
                <input
                  type="text"
                  value={meetingForm.title}
                  onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={meetingForm.date}
                    onChange={(e) => setMeetingForm({ ...meetingForm, date: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Horario</label>
                  <input
                    type="text"
                    value={meetingForm.time}
                    placeholder="10:00 AM - 11:00 AM"
                    onChange={(e) => setMeetingForm({ ...meetingForm, time: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Modalidad</label>
                  <select
                    value={meetingForm.meetingMethod}
                    onChange={(e) =>
                      setMeetingForm({ ...meetingForm, meetingMethod: e.target.value as any })
                    }
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-300 bg-white focus:outline-hidden focus:border-[#00668F]"
                  >
                    <option value="virtual">💻 Virtual (Microsoft Teams)</option>
                    <option value="presencial">🏢 Presencial (En Sitio)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Ubicación / Plataforma</label>
                  <input
                    type="text"
                    value={meetingForm.location}
                    onChange={(e) => setMeetingForm({ ...meetingForm, location: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Asistentes Convocados</label>
                <input
                  type="text"
                  value={meetingForm.attendees}
                  onChange={(e) => setMeetingForm({ ...meetingForm, attendees: e.target.value })}
                  placeholder="Separados por coma..."
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Objetivo / Agenda</label>
                <textarea
                  rows={2}
                  value={meetingForm.description}
                  onChange={(e) => setMeetingForm({ ...meetingForm, description: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 bg-gray-50 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setIsScheduleMeetingModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200/70 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveMeeting}
                className="px-4 py-2 text-xs font-bold bg-[#00668F] text-white rounded-xl shadow-xs hover:bg-[#005273] cursor-pointer"
              >
                Integrar al Calendario Oficial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL PARA REGISTRO RÁPIDO DE LLAMADA COMERCIAL */}
      {/* ========================================================================= */}
      {isQuickCallModalOpen && selectedOppForCall && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-gray-200">
            <div className="bg-emerald-600 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone size={18} />
                <h3 className="text-sm font-bold">Registrar Llamada con Cliente</h3>
              </div>
              <button
                onClick={() => setIsQuickCallModalOpen(false)}
                className="text-white/80 hover:text-white font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="text-xs text-gray-600">
                <strong className="text-gray-900 block font-semibold">{selectedOppForCall.title}</strong>
                <span>Cliente: {selectedOppForCall.clientName}</span>
                {selectedOppForCall.clientPhone && (
                  <span className="block text-emerald-700 font-bold mt-1">
                    📞 {selectedOppForCall.clientPhone}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Notas / Resumen de la Conversación
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Se conversó con el ingeniero sobre la fecha de parada técnica, enviará pliegos..."
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-emerald-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 bg-gray-50 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setIsQuickCallModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200/70 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveQuickCall}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs cursor-pointer"
              >
                Guardar en Bitácora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Universal de Configuración de CRM */}
      <UniversalModuleConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        moduleId="crm"
        moduleTitle="CRM y Pipeline Comercial"
      />

      {/* MODAL BLINDADO POKA-YOKE: ELIMINAR OPORTUNIDAD */}
      <ConfirmDeleteModal
        isOpen={Boolean(oppToDelete)}
        title="¿Eliminar Oportunidad Comercial?"
        itemName={oppToDelete ? `${oppToDelete.title} - ${oppToDelete.clientName} (${formatUSD(oppToDelete.estimatedValueUSD)})` : ''}
        description="Esta acción eliminará la oportunidad y todo su historial de actividades y cotizaciones del pipeline comercial."
        confirmText="Eliminar Oportunidad"
        onConfirm={() => {
          if (oppToDelete) {
            deleteOpportunity(oppToDelete.id);
            setOppToDelete(null);
          }
        }}
        onCancel={() => setOppToDelete(null)}
      />

      {/* MODAL BLINDADO POKA-YOKE: ELIMINAR CONTACTO */}
      <ConfirmDeleteModal
        isOpen={Boolean(contactToDelete)}
        title="¿Eliminar Contacto del Directorio?"
        itemName={contactToDelete ? `${contactToDelete.name} (${contactToDelete.company || 'Cliente'})` : ''}
        description="Esta acción eliminará el contacto comercial de la libreta de direcciones."
        confirmText="Eliminar Contacto"
        onConfirm={() => {
          if (contactToDelete) {
            deleteContact(contactToDelete.id);
            setContactToDelete(null);
          }
        }}
        onCancel={() => setContactToDelete(null)}
      />
    </div>
  );
};
