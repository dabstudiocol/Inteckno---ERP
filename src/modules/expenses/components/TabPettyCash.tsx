import React, { useState, useMemo } from 'react';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  FileText,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Building2,
  Briefcase,
  X,
  Sparkles,
  DollarSign,
  Receipt,
  User,
  ShieldCheck,
  Calendar,
  Layers,
} from 'lucide-react';
import { ExpenseEntry, Project } from '../../../types';
import { LightTable } from '../../../components/ui/LightTable';
import { CreatableSelect } from '../../../components/common/CreatableSelect';

interface TabPettyCashProps {
  expenses: ExpenseEntry[];
  projects: Project[];
  currentUser: any;
  onSubmitExpense: (expense: Omit<ExpenseEntry, 'id' | 'status'>) => void;
  onApproveExpense: (id: string) => void;
  onDeleteExpense: (id: string) => void;
}

export const TabPettyCash: React.FC<TabPettyCashProps> = ({
  expenses,
  projects,
  currentUser,
  onSubmitExpense,
  onApproveExpense,
  onDeleteExpense,
}) => {
  // Filtrar solo los movimientos de caja menor
  const pettyCashEntries = useMemo(() => {
    return expenses
      .filter((e) => e.isPettyCash || e.paymentMethod?.toLowerCase().includes('caja menor'))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses]);

  // Filtros de búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [docFilter, setDocFilter] = useState<'all' | 'DS' | 'FE' | 'ticket'>('all');
  const [imputationFilter, setImputationFilter] = useState<'all' | 'proyecto' | 'oficina'>('all');

  // Modal para nuevo movimiento de Caja Menor
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [movementType, setMovementType] = useState<'egreso' | 'deposito'>('egreso');
  const [receiptNo, setReceiptNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [receivedBy, setReceivedBy] = useState('');
  const [chargedTo, setChargedTo] = useState('PAGO EFECTIVO');
  const [dianDocType, setDianDocType] = useState<'FE' | 'DS' | 'ticket' | 'ninguno'>('DS');
  const [dianDocNumber, setDianDocNumber] = useState('');
  const [imputationType, setImputationType] = useState<'proyecto' | 'oficina'>('proyecto');
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');
  const [observations, setObservations] = useState('');

  // Estadísticas de Arqueo
  const { totalDeposits, totalWithdrawals, currentBalance, countDS, countFE } = useMemo(() => {
    let dep = 0;
    let wit = 0;
    let dsCount = 0;
    let feCount = 0;

    pettyCashEntries.forEach((e) => {
      if (e.movementType === 'deposito') {
        dep += Number(e.depositedAmount || e.amount || 0);
      } else {
        wit += Number(e.withdrawnAmount || e.amount || 0);
      }
      if (e.dianDocType === 'DS' || e.invoiceNumber?.startsWith('DS-')) dsCount++;
      if (e.dianDocType === 'FE' || e.invoiceNumber?.startsWith('FE')) feCount++;
    });

    return {
      totalDeposits: dep,
      totalWithdrawals: wit,
      currentBalance: dep - wit,
      countDS: dsCount,
      countFE: feCount,
    };
  }, [pettyCashEntries]);

  // Filtro de tabla
  const filteredEntries = useMemo(() => {
    return pettyCashEntries.filter((e) => {
      const matchSearch =
        searchTerm === '' ||
        e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.receivedBy && e.receivedBy.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.dianDocNumber && e.dianDocNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.invoiceNumber && e.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.observations && e.observations.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.pettyCashReceiptNo && e.pettyCashReceiptNo.includes(searchTerm));

      const matchDoc =
        docFilter === 'all' ||
        e.dianDocType === docFilter ||
        (docFilter === 'DS' && e.invoiceNumber?.startsWith('DS-')) ||
        (docFilter === 'FE' && e.invoiceNumber?.startsWith('FE'));

      const matchImp =
        imputationFilter === 'all' ||
        (imputationFilter === 'proyecto' && e.imputationType === 'proyecto') ||
        (imputationFilter === 'oficina' && (e.imputationType === 'oficina' || !e.projectCode));

      return matchSearch && matchDoc && matchImp;
    });
  }, [pettyCashEntries, searchTerm, docFilter, imputationFilter]);

  const handleOpenModal = (type: 'egreso' | 'deposito') => {
    setMovementType(type);
    const nextReceipt = pettyCashEntries.length > 0 ? String(pettyCashEntries.length) : '1';
    setReceiptNo(type === 'deposito' ? '0' : nextReceipt);
    setDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setAmount(0);
    setReceivedBy(currentUser?.name || '');
    setChargedTo(type === 'deposito' ? 'SALDO INICIAL / REEMBOLSO' : 'PAGO EFECTIVO');
    setDianDocType(type === 'deposito' ? 'ninguno' : 'DS');
    setDianDocNumber('');
    setImputationType('proyecto');
    setObservations('');
    setIsModalOpen(true);
  };

  const handleSaveMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || amount <= 0) {
      alert('Por favor ingresa una descripción válida y un importe mayor a cero.');
      return;
    }

    const selectedProj = projects.find((p) => p.id === selectedProjectId);

    onSubmitExpense({
      userId: currentUser?.id || 'USR-04',
      userName: receivedBy || currentUser?.name || 'Administración',
      date,
      category: 'materiales_obra',
      categoryLabel: description,
      amount,
      currency: 'COP',
      description,
      costCenter: imputationType === 'oficina' ? 'CC-ADM-OFICINA' : (selectedProj ? `CC-${selectedProj.code}` : 'CC-PROY'),
      paymentMethod: 'Efectivo (Caja Menor)',
      imputationType,
      projectCode: imputationType === 'proyecto' ? selectedProj?.code : undefined,
      projectId: imputationType === 'proyecto' ? selectedProj?.id : undefined,
      isPettyCash: true,
      pettyCashReceiptNo: receiptNo || '0',
      receivedBy,
      chargedTo,
      dianDocType,
      dianDocNumber: dianDocNumber || undefined,
      invoiceNumber: dianDocNumber || undefined,
      movementType,
      depositedAmount: movementType === 'deposito' ? amount : 0,
      withdrawnAmount: movementType === 'egreso' ? amount : 0,
      observations: observations || (imputationType === 'oficina' ? 'OFICINA' : selectedProj?.code || ''),
    });

    setIsModalOpen(false);
  };

  const isFinance =
    currentUser?.role === 'gerente_administrativa' ||
    currentUser?.role === 'gerente_general' ||
    currentUser?.role === 'lider_proyectos';

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* TARJETAS KPI DE CAJA MENOR Y ARQUEO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Saldo Disponible en Caja */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4.5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Saldo Disponible</span>
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400">
              <Wallet size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-white">
            ${currentBalance.toLocaleString()} <span className="text-xs font-normal text-slate-300">COP</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-300">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Base oficial ITK: $1.000.000 COP
          </div>
        </div>

        {/* Total Depósitos / Reembolsos */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fondos Depositados</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-slate-900">
            ${totalDeposits.toLocaleString()} <span className="text-xs font-normal text-slate-400">COP</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Reembolsos de tesorería y saldos iniciales</p>
        </div>

        {/* Total Egresos Realizados */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Egresos Ejecutados</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-rose-700">
            ${totalWithdrawals.toLocaleString()} <span className="text-xs font-normal text-slate-400">COP</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Gastos menores de taller, fletes y oficina</p>
        </div>

        {/* Trazabilidad Fiscal DIAN */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cruces Fiscales DIAN</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-[#00668F] flex items-center justify-center">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <div>
              <span className="text-lg font-black text-slate-900">{countDS}</span>
              <span className="text-[10px] block text-slate-400 font-bold uppercase">Doc. Soporte</span>
            </div>
            <div className="h-6 w-px bg-slate-200"></div>
            <div>
              <span className="text-lg font-black text-slate-900">{countFE}</span>
              <span className="text-[10px] block text-slate-400 font-bold uppercase">Factura Elec.</span>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-emerald-700 font-medium">100% legalizado contablemente</p>
        </div>
      </div>

      {/* BARRA DE HERRAMIENTAS, FILTROS Y ACCIONES */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Búsqueda predictiva */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Buscar por descripción, beneficiario, N° recibo, DS-XXXX o proyecto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00668F] focus:border-transparent text-slate-900 placeholder-slate-400 font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filtros rápidos y botones de acción */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro Comprobante DIAN */}
            <select
              value={docFilter}
              onChange={(e: any) => setDocFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-[#00668F]"
            >
              <option value="all">Todos los Comprobantes</option>
              <option value="DS">Solo Documento Soporte (DS)</option>
              <option value="FE">Solo Factura Electrónica (FE)</option>
              <option value="ticket">Tickets / Otros</option>
            </select>

            {/* Filtro Imputación */}
            <select
              value={imputationFilter}
              onChange={(e: any) => setImputationFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-[#00668F]"
            >
              <option value="all">Todas las Imputaciones</option>
              <option value="proyecto">Solo Proyectos STC</option>
              <option value="oficina">Solo Gastos Oficina / SST</option>
            </select>

            {/* Botón Reembolso / Depósito */}
            <button
              onClick={() => handleOpenModal('deposito')}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-all border border-emerald-200 flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <ArrowDownLeft size={14} />
              <span>+ Depósito / Reembolso</span>
            </button>

            {/* Botón Nuevo Gasto Caja Menor */}
            <button
              onClick={() => handleOpenModal('egreso')}
              className="px-4 py-2 rounded-xl bg-[#00668F] hover:bg-[#005073] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Plus size={15} />
              <span>Registrar Egreso</span>
            </button>
          </div>
        </div>
      </div>

      {/* TABLA PRINCIPAL DE REGISTROS DE CAJA MENOR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Libro Diario de Caja Menor ({filteredEntries.length} movimientos)</h3>
            <p className="text-[11px] text-slate-500">Plantilla oficial de Registro de gastos menores - Inteckno S.A.S.</p>
          </div>
        </div>

        <LightTable
          data={filteredEntries}
          keyExtractor={(it) => it.id}
          columns={[
            {
              key: 'receipt',
              header: 'N° Recibo / Fecha',
              render: (it) => (
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-xs text-[#00668F]">Recibo #{it.pettyCashReceiptNo ?? '0'}</span>
                    {it.movementType === 'deposito' && (
                      <span className="px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                        Depósito
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">{it.date}</div>
                </div>
              ),
            },
            {
              key: 'description',
              header: 'Descripción / Concepto',
              render: (it) => (
                <div className="max-w-xs sm:max-w-sm">
                  <div className="text-xs font-bold text-slate-900 leading-tight">{it.description}</div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>Recibido por: <strong className="text-slate-700">{it.receivedBy || it.userName}</strong></span>
                  </div>
                </div>
              ),
            },
            {
              key: 'imputation',
              header: 'Imputación / Proyecto',
              render: (it) => {
                const isOficina = it.imputationType === 'oficina' || !it.projectCode;
                return (
                  <div className="space-y-0.5">
                    {isOficina ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                        <Building2 size={11} className="text-[#00668F]" /> Oficina / Taller
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-[#00668F] text-[10px] font-bold">
                        <Briefcase size={11} /> {it.projectCode}
                      </span>
                    )}
                    {it.observations && (
                      <div className="text-[10px] text-slate-400 font-mono">{it.observations}</div>
                    )}
                  </div>
                );
              },
            },
            {
              key: 'dianDoc',
              header: 'Soporte / Factura DIAN',
              render: (it) => {
                const doc = it.dianDocNumber || it.invoiceNumber;
                if (!doc) {
                  return <span className="text-[11px] text-slate-400 italic">Sin comprobante</span>;
                }
                const isDS = doc.startsWith('DS-');
                const isFE = doc.startsWith('FE') || doc.startsWith('FVE');
                return (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                      isDS
                        ? 'bg-amber-50 text-amber-900 border border-amber-200'
                        : isFE
                        ? 'bg-indigo-50 text-indigo-900 border border-indigo-200'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    <FileText size={11} />
                    {doc}
                  </span>
                );
              },
            },
            {
              key: 'flow',
              header: 'Flujo / Importe',
              align: 'right',
              render: (it) => {
                const isDep = it.movementType === 'deposito';
                const amt = isDep ? (it.depositedAmount || it.amount) : (it.withdrawnAmount || it.amount);
                return (
                  <div className="text-right">
                    <div
                      className={`text-xs font-black ${
                        isDep ? 'text-emerald-600' : 'text-slate-900'
                      }`}
                    >
                      {isDep ? '+ ' : '- '}${Number(amt).toLocaleString()} <span className="text-[10px] font-normal text-slate-400">COP</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">
                      {isDep ? 'Ingreso a caja' : 'Retiro en efectivo'}
                    </div>
                  </div>
                );
              },
            },
            {
              key: 'status',
              header: 'Estado',
              align: 'center',
              render: (it) => (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    it.status === 'approved'
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'bg-amber-50 text-amber-800'
                  }`}
                >
                  {it.status === 'approved' ? 'Arqueado' : 'Pendiente'}
                </span>
              ),
            },
            {
              key: 'actions',
              header: 'Acción',
              align: 'right',
              render: (it) => (
                <div className="flex items-center justify-end gap-1.5">
                  {it.status === 'pending' && isFinance && (
                    <button
                      onClick={() => onApproveExpense(it.id)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition-all cursor-pointer"
                    >
                      Arquear
                    </button>
                  )}
                  <button
                    onClick={() => onDeleteExpense(it.id)}
                    className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Eliminar movimiento"
                  >
                    <X size={13} />
                  </button>
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* MODAL PARA NUEVO REGISTRO / ARQUEO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl space-y-4 my-8 animate-in zoom-in-95 duration-150">
            {/* Cabecera del Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center text-white ${
                    movementType === 'deposito' ? 'bg-emerald-600' : 'bg-[#00668F]'
                  }`}
                >
                  {movementType === 'deposito' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {movementType === 'deposito' ? 'Depósito / Reembolso de Caja Menor' : 'Registrar Egreso de Caja Menor'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {movementType === 'deposito' ? 'Inyección de liquidez o saldo inicial' : 'Pago en efectivo para suministros o viáticos'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveMovement} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Recibo N° */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">N° Recibo</label>
                  <input
                    type="text"
                    value={receiptNo}
                    onChange={(e) => setReceiptNo(e.target.value)}
                    placeholder="ej. 20"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#00668F] font-bold"
                  />
                </div>

                {/* Fecha */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#00668F] font-medium"
                  />
                </div>
              </div>

              {/* Descripción del gasto / depósito */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Descripción del Movimiento *</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="ej. COMPRA DE REMACHES + TRANSPORTE"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#00668F] font-medium text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Importe COP */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Importe ($ COP) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    placeholder="ej. 46000"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#00668F] font-black text-slate-900"
                  />
                </div>

                {/* Recibido por */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Recibido por</label>
                  <input
                    type="text"
                    value={receivedBy}
                    onChange={(e) => setReceivedBy(e.target.value)}
                    placeholder="ej. SANTIAGO ARBELAEZ"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#00668F] font-medium"
                  />
                </div>
              </div>

              {/* Cruce Fiscal DIAN */}
              {movementType === 'egreso' && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Cruce Fiscal DIAN</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Tipo Comprobante</label>
                      <select
                        value={dianDocType}
                        onChange={(e: any) => setDianDocType(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-semibold"
                      >
                        <option value="DS">Documento Soporte (DS)</option>
                        <option value="FE">Factura Electrónica (FE)</option>
                        <option value="ticket">Ticket / Comprobante</option>
                        <option value="ninguno">Sin comprobante formal</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">N° Factura / DS</label>
                      <input
                        type="text"
                        value={dianDocNumber}
                        onChange={(e) => setDianDocNumber(e.target.value)}
                        placeholder="ej. DS-1046 o FE-1092"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Imputación a Proyecto u Oficina */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-700">Imputación de Costo</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="imputation"
                      checked={imputationType === 'proyecto'}
                      onChange={() => setImputationType('proyecto')}
                      className="text-[#00668F] focus:ring-[#00668F]"
                    />
                    <span>Proyecto STC</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="imputation"
                      checked={imputationType === 'oficina'}
                      onChange={() => setImputationType('oficina')}
                      className="text-[#00668F] focus:ring-[#00668F]"
                    />
                    <span>Oficina / Taller / SST</span>
                  </label>
                </div>

                {imputationType === 'proyecto' && (
                  <div className="mt-2">
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#00668F] font-bold text-slate-800"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.code} - {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Observaciones (ej. P23-24ITEM27) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Observaciones / Rubro de Obra</label>
                <input
                  type="text"
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="ej. P23-24ITEM27 o REPARACION DE MOTOR"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#00668F] font-medium"
                />
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#00668F] hover:bg-[#005073] text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  Guardar Movimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
