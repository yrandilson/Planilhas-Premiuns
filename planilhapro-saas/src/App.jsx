import React, { useState, useMemo, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc,
  setDoc, 
  updateDoc,
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  LayoutDashboard, 
  Receipt, 
  Settings, 
  PlusCircle, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  FileText,
  Download,
  Trash2,
  Pencil,
  Save,
  X,
  LogOut,
  User,
  Lock,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { auth, db, appId, isCanvasEnvironment, initFirebaseAuth } from './firebase';

const PLAN_FEATURES = {
  basic: [
    'dashboard.view',
    'entries.view',
    'entries.create',
    'entries.delete',
    'settings.categories',
  ],
  pro: [
    'dashboard.view',
    'dashboard.growth',
    'dashboard.charts',
    'reports.export',
    'entries.view',
    'entries.create',
    'entries.delete',
    'entries.edit',
    'entries.monthFilter',
    'budgets.manage',
    'budgets.alerts',
    'recurring.manage',
    'recurring.autoApply',
    'settings.categories',
  ],
  enterprise: [
    'dashboard.view',
    'dashboard.growth',
    'dashboard.charts',
    'reports.export',
    'entries.view',
    'entries.create',
    'entries.delete',
    'entries.edit',
    'entries.monthFilter',
    'budgets.manage',
    'budgets.alerts',
    'recurring.manage',
    'recurring.autoApply',
    'settings.categories',
  ],
};

export default function App() {
  // --- ESTADOS DO SISTEMA ---
  const [firebaseUser, setFirebaseUser] = useState(null); // Utilizador interno do Firebase
  const [saasUser, setSaasUser] = useState(null);         // Utilizador do UI (Cliente)
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authInfo, setAuthInfo] = useState('');
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [userPlan, setUserPlan] = useState('basic');
  const [userRole, setUserRole] = useState('client');
  const [featureFlags, setFeatureFlags] = useState({});
  const [isLoadingAccess, setIsLoadingAccess] = useState(true);
  const [accessPlanDraft, setAccessPlanDraft] = useState('basic');
  const [accessRoleDraft, setAccessRoleDraft] = useState('client');
  const [accessFlagsDraft, setAccessFlagsDraft] = useState({});
  const [accessInfo, setAccessInfo] = useState('');
  const [accessError, setAccessError] = useState('');
  const [isSavingAccess, setIsSavingAccess] = useState(false);
  const [loadedAccessPlan, setLoadedAccessPlan] = useState('basic');
  const [loadedAccessRole, setLoadedAccessRole] = useState('client');
  const [targetAccessUid, setTargetAccessUid] = useState('');
  const [loadedAccessUid, setLoadedAccessUid] = useState('');
  const [entries, setEntries] = useState([]);
  const [entryError, setEntryError] = useState('');
  const [entryInfo, setEntryInfo] = useState('');
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editFormData, setEditFormData] = useState({
    date: '',
    description: '',
    type: 'Receita',
    category: '',
    amount: ''
  });
  const [categories, setCategories] = useState([
    'Serviços Prestados', 'Vendas de Produtos', 'Software e Subscrições', 'Materiais de Escritório', 'Impostos e Taxas'
  ]);
  const [newCategory, setNewCategory] = useState('');
  const [budgetLimits, setBudgetLimits] = useState({});
  const [budgetDraft, setBudgetDraft] = useState({});
  const [budgetInfo, setBudgetInfo] = useState('');
  const [budgetError, setBudgetError] = useState('');
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const [recurringItems, setRecurringItems] = useState([]);
  const [recurringInfo, setRecurringInfo] = useState('');
  const [recurringError, setRecurringError] = useState('');
  const [isSavingRecurring, setIsSavingRecurring] = useState(false);
  const [recurringForm, setRecurringForm] = useState({
    description: '',
    category: 'Software e Subscrições',
    amount: '',
    frequency: 'monthly',
    startDate: new Date().toISOString().split('T')[0],
    active: true,
  });

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    type: 'Receita',
    category: categories[0] || '',
    amount: ''
  });

  const envEnabledFlags = useMemo(() => {
    return String(import.meta.env.VITE_FEATURE_FLAGS_ENABLED || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }, []);

  const envDisabledFlags = useMemo(() => {
    return String(import.meta.env.VITE_FEATURE_FLAGS_DISABLED || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }, []);

  const hasFeature = (featureKey) => {
    if (envDisabledFlags.includes(featureKey)) return false;
    if (featureFlags[featureKey] === false) return false;
    if (featureFlags[featureKey] === true) return true;
    if (envEnabledFlags.includes(featureKey)) return true;

    const planFeatures = PLAN_FEATURES[userPlan] || PLAN_FEATURES.basic;
    return planFeatures.includes(featureKey);
  };

  const adminEmail = String(import.meta.env.VITE_ADMIN_EMAIL || '').trim().toLowerCase();
  const isAdminUser = userRole === 'admin' || (!!adminEmail && String(saasUser?.email || '').toLowerCase() === adminEmail);

  const FEATURE_KEYS = [
    'dashboard.growth',
    'dashboard.charts',
    'reports.export',
    'entries.edit',
    'entries.monthFilter',
    'budgets.manage',
    'budgets.alerts',
    'recurring.manage',
    'recurring.autoApply',
  ];

  const recurringAutoEnabled = hasFeature('recurring.autoApply');

  useEffect(() => {
    if (!isAdminUser && activeTab === 'settings') {
      setActiveTab('dashboard');
    }
  }, [isAdminUser, activeTab]);

  const addRecurringInterval = (dateValue, frequency) => {
    const date = new Date(dateValue);
    date.setHours(0, 0, 0, 0);

    if (frequency === 'weekly') {
      date.setDate(date.getDate() + 7);
      return date;
    }

    date.setMonth(date.getMonth() + 1);
    return date;
  };

  // --- 2. INICIALIZAÇÃO E AUTENTICAÇÃO ---
  useEffect(() => {
    // Requisito obrigatório para funcionamento no ambiente de teste
    const initAuth = async () => {
      await initFirebaseAuth();
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
      // Se for ambiente real e já houver login feito, salta o ecrã de login
      if (!isCanvasEnvironment && u) {
        setSaasUser({ email: u.email, name: u.email.split('@')[0], uid: u.uid });
      }
    });
    return () => unsubscribe();
  }, []);

  // --- 3. LEITURA DE DADOS (FIRESTORE) ---
  useEffect(() => {
    if (!saasUser || !firebaseUser) return; // Só carrega se estiver autenticado no sistema

    // Define qual UID usar (No teste usa o do ambiente, no Real usa o do cliente)
    const uid = isCanvasEnvironment ? firebaseUser.uid : saasUser.uid;
    
    // Caminho seguro na base de dados
    const entriesRef = collection(db, 'artifacts', appId, 'users', uid, 'entries');

    const unsubscribe = onSnapshot(entriesRef, (snapshot) => {
      const fetchedEntries = [];
      snapshot.forEach(doc => {
        fetchedEntries.push({ id: doc.id, ...doc.data() });
      });
      // Ordenação na memória (obrigatório para contornar índices complexos)
      fetchedEntries.sort((a, b) => new Date(b.date) - new Date(a.date));
      setEntries(fetchedEntries);
    }, (error) => {
      console.error("Erro ao carregar dados:", error);
    });

    return () => unsubscribe();
  }, [saasUser, firebaseUser]);

  useEffect(() => {
    setAccessPlanDraft(userPlan);
    setAccessRoleDraft(userRole);
    setAccessFlagsDraft(featureFlags);
  }, [userPlan, userRole, featureFlags]);

  useEffect(() => {
    const currentUid = isCanvasEnvironment ? firebaseUser?.uid : saasUser?.uid;
    if (currentUid) {
      setTargetAccessUid(currentUid);
      setLoadedAccessUid(currentUid);
    }
  }, [saasUser, firebaseUser]);

  useEffect(() => {
    if (!saasUser || !firebaseUser) {
      setRecurringItems([]);
      return;
    }

    const uid = isCanvasEnvironment ? firebaseUser.uid : saasUser.uid;
    const recurringRef = collection(db, 'artifacts', appId, 'users', uid, 'recurrings');

    const unsubscribe = onSnapshot(recurringRef, (snapshot) => {
      const items = [];
      snapshot.forEach((itemDoc) => {
        items.push({ id: itemDoc.id, ...itemDoc.data() });
      });
      items.sort((a, b) => String(a.description || '').localeCompare(String(b.description || '')));
      setRecurringItems(items);
    }, () => {
      setRecurringItems([]);
    });

    return () => unsubscribe();
  }, [saasUser, firebaseUser]);

  useEffect(() => {
    if (!recurringAutoEnabled) return;
    if (!saasUser || !firebaseUser || recurringItems.length === 0) return;

    const applyRecurringEntries = async () => {
      const uid = isCanvasEnvironment ? firebaseUser.uid : saasUser.uid;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const recurring of recurringItems) {
        if (!recurring.active) continue;
        if (!recurring.amount || Number(recurring.amount) <= 0) continue;

        const rawNextRun = recurring.nextRunDate || recurring.startDate;
        if (!rawNextRun) continue;

        let nextRun = new Date(rawNextRun);
        nextRun.setHours(0, 0, 0, 0);
        let iterations = 0;

        while (nextRun <= today && iterations < 24) {
          const dateStr = nextRun.toISOString().split('T')[0];
          const generatedEntryId = `${recurring.id}_${dateStr}`;

          await setDoc(doc(db, 'artifacts', appId, 'users', uid, 'entries', generatedEntryId), {
            date: dateStr,
            description: recurring.description,
            type: 'Despesa',
            category: recurring.category,
            amount: Number(recurring.amount),
            source: 'recurring',
            recurringId: recurring.id,
            createdAt: new Date().toISOString(),
          });

          nextRun = addRecurringInterval(nextRun, recurring.frequency || 'monthly');
          iterations += 1;
        }

        if (iterations > 0) {
          await updateDoc(doc(db, 'artifacts', appId, 'users', uid, 'recurrings', recurring.id), {
            nextRunDate: nextRun.toISOString().split('T')[0],
            lastGeneratedAt: new Date().toISOString(),
          });
        }
      }
    };

    applyRecurringEntries().catch(() => {
      // Silencia erro de recorrencia para nao interromper a UX do app.
    });
  }, [recurringItems, saasUser, firebaseUser, recurringAutoEnabled]);

  useEffect(() => {
    if (!saasUser || !firebaseUser) {
      setIsLoadingAccess(false);
      return;
    }

    setIsLoadingAccess(true);
    const uid = isCanvasEnvironment ? firebaseUser.uid : saasUser.uid;
    const accessDocRef = doc(db, 'artifacts', appId, 'users', uid, 'profile', 'access');

    const unsubscribe = onSnapshot(accessDocRef, (snapshot) => {
      if (!snapshot.exists()) {
        setUserPlan('basic');
        setLoadedAccessPlan('basic');
        setUserRole('client');
        setLoadedAccessRole('client');
        setFeatureFlags({});
        setIsLoadingAccess(false);
        return;
      }

      const accessData = snapshot.data() || {};
      const normalizedPlan = String(accessData.plan || 'basic').toLowerCase();
      const normalizedRole = String(accessData.role || 'client').toLowerCase();
      setUserPlan(PLAN_FEATURES[normalizedPlan] ? normalizedPlan : 'basic');
      setLoadedAccessPlan(PLAN_FEATURES[normalizedPlan] ? normalizedPlan : 'basic');
      setUserRole(normalizedRole === 'admin' ? 'admin' : 'client');
      setLoadedAccessRole(normalizedRole === 'admin' ? 'admin' : 'client');
      setFeatureFlags(typeof accessData.featureFlags === 'object' && accessData.featureFlags !== null ? accessData.featureFlags : {});
      setIsLoadingAccess(false);
    }, () => {
      setUserPlan('basic');
      setLoadedAccessPlan('basic');
      setUserRole('client');
      setLoadedAccessRole('client');
      setFeatureFlags({});
      setIsLoadingAccess(false);
    });

    return () => unsubscribe();
  }, [saasUser, firebaseUser]);

  useEffect(() => {
    if (!saasUser || !firebaseUser) {
      setBudgetLimits({});
      setBudgetDraft({});
      return;
    }

    const uid = isCanvasEnvironment ? firebaseUser.uid : saasUser.uid;
    const budgetDocRef = doc(db, 'artifacts', appId, 'users', uid, 'profile', 'budgets');

    const unsubscribe = onSnapshot(budgetDocRef, (snapshot) => {
      if (!snapshot.exists()) {
        setBudgetLimits({});
        setBudgetDraft({});
        return;
      }

      const data = snapshot.data() || {};
      const limits = typeof data.limits === 'object' && data.limits !== null ? data.limits : {};
      setBudgetLimits(limits);
      setBudgetDraft(limits);
    }, () => {
      setBudgetLimits({});
      setBudgetDraft({});
    });

    return () => unsubscribe();
  }, [saasUser, firebaseUser]);


  // --- 4. FUNÇÕES DE ACÇÃO ---
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoadingAuth(true);
    setAuthError('');
    setAuthInfo('');

    try {
      if (isCanvasEnvironment) {
        // SIMULAÇÃO PARA AMBIENTE DE TESTE
        setSaasUser({ email: email, name: email.split('@')[0], uid: firebaseUser?.uid || Date.now().toString() });
      } else {
        // AUTENTICAÇÃO REAL PARA VERCEL (FIREBASE AUTH)
        if (authMode === 'login') {
          const userCred = await signInWithEmailAndPassword(auth, email, password);
          setSaasUser({ email: userCred.user.email, name: userCred.user.email.split('@')[0], uid: userCred.user.uid });
        } else {
          const userCred = await createUserWithEmailAndPassword(auth, email, password);
          setSaasUser({ email: userCred.user.email, name: userCred.user.email.split('@')[0], uid: userCred.user.uid });
        }
      }
    } catch (error) {
      if (error.code === 'auth/invalid-credential') setAuthError('E-mail ou Palavra-passe incorretos.');
      else if (error.code === 'auth/email-already-in-use') setAuthError('Este e-mail já está registado.');
      else setAuthError(error.message);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setAuthError('Informe o seu e-mail para recuperar a palavra-passe.');
      setAuthInfo('');
      return;
    }

    if (isCanvasEnvironment) {
      setAuthError('Recuperação de palavra-passe disponível apenas no ambiente Firebase real.');
      setAuthInfo('');
      return;
    }

    setIsLoadingAuth(true);
    setAuthError('');
    setAuthInfo('');

    try {
      await sendPasswordResetEmail(auth, email);
      setAuthInfo('E-mail de recuperação enviado. Verifique a sua caixa de entrada.');
    } catch (error) {
      if (error.code === 'auth/user-not-found') setAuthError('Não existe conta com este e-mail.');
      else if (error.code === 'auth/invalid-email') setAuthError('E-mail inválido.');
      else setAuthError(error.message);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleLogout = async () => {
    if (!isCanvasEnvironment) await signOut(auth);
    setSaasUser(null);
    setEmail('');
    setPassword('');
  };

  const handleAddEntry = async (e) => {
    e.preventDefault();
    if (!formData.description || !formData.amount || formData.amount <= 0) return;

    setEntryError('');
    setEntryInfo('');

    const uid = isCanvasEnvironment ? firebaseUser?.uid : saasUser?.uid;
    if (!uid) {
      setEntryError('Sessão inválida. Faça login novamente.');
      return;
    }

    const newEntry = {
      date: formData.date,
      description: formData.description,
      type: formData.type,
      category: formData.category,
      amount: parseFloat(formData.amount),
      createdAt: new Date().toISOString()
    };

    setIsSavingEntry(true);
    try {
      const newDocRef = doc(collection(db, 'artifacts', appId, 'users', uid, 'entries'));
      await setDoc(newDocRef, newEntry); // Grava na nuvem!
      setFormData({ ...formData, description: '', amount: '' });
      setEntryInfo('Registo guardado com sucesso.');
    } catch (error) {
      if (error.code === 'permission-denied') setEntryError('Sem permissão para gravar. Verifique as regras do Firestore.');
      else if (error.code === 'failed-precondition') setEntryError('Firestore não configurado. Ative o Firestore Database no Firebase.');
      else if (error.code === 'unavailable') setEntryError('Serviço indisponível no momento. Tente novamente.');
      else setEntryError(`Erro ao guardar registo: ${error.message}`);
      console.error('Erro ao adicionar:', error);
    } finally {
      setIsSavingEntry(false);
    }
  };

  const handleDeleteEntry = async (id) => {
    setEntryError('');
    setEntryInfo('');

    try {
      const uid = isCanvasEnvironment ? firebaseUser?.uid : saasUser?.uid;
      if (!uid) {
        setEntryError('Sessão inválida. Faça login novamente.');
        return;
      }

      await deleteDoc(doc(db, 'artifacts', appId, 'users', uid, 'entries', id)); // Remove da nuvem!
      setEntryInfo('Registo removido com sucesso.');
    } catch (error) {
      if (error.code === 'permission-denied') setEntryError('Sem permissão para remover. Verifique as regras do Firestore.');
      else setEntryError(`Erro ao apagar registo: ${error.message}`);
      console.error('Erro ao apagar:', error);
    }
  };

  const handleStartEdit = (entry) => {
    if (!hasFeature('entries.edit')) {
      setEntryError('Edição disponível apenas no plano Pro.');
      return;
    }

    setEntryError('');
    setEntryInfo('');
    setEditingEntryId(entry.id);
    setEditFormData({
      date: entry.date,
      description: entry.description,
      type: entry.type,
      category: entry.category,
      amount: String(entry.amount),
    });
  };

  const handleCancelEdit = () => {
    setEditingEntryId(null);
    setEditFormData({ date: '', description: '', type: 'Receita', category: '', amount: '' });
  };

  const handleSaveEdit = async () => {
    if (!hasFeature('entries.edit')) {
      setEntryError('Edição disponível apenas no plano Pro.');
      return;
    }

    if (!editingEntryId) return;
    if (!editFormData.description || !editFormData.amount || Number(editFormData.amount) <= 0) {
      setEntryError('Preencha os dados do registo antes de guardar alterações.');
      return;
    }

    const uid = isCanvasEnvironment ? firebaseUser?.uid : saasUser?.uid;
    if (!uid) {
      setEntryError('Sessão inválida. Faça login novamente.');
      return;
    }

    setIsSavingEdit(true);
    setEntryError('');
    setEntryInfo('');

    try {
      await updateDoc(doc(db, 'artifacts', appId, 'users', uid, 'entries', editingEntryId), {
        date: editFormData.date,
        description: editFormData.description,
        type: editFormData.type,
        category: editFormData.category,
        amount: parseFloat(editFormData.amount),
      });
      setEntryInfo('Registo atualizado com sucesso.');
      handleCancelEdit();
    } catch (error) {
      if (error.code === 'permission-denied') setEntryError('Sem permissão para editar. Verifique as regras do Firestore.');
      else setEntryError(`Erro ao editar registo: ${error.message}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (newCategory && !categories.includes(newCategory)) {
      setCategories([...categories, newCategory]);
      setNewCategory('');
    }
  };

  const handleToggleAccessFlag = (flagKey) => {
    if (!isAdminUser) return;

    setAccessInfo('');
    setAccessError('');

    setAccessFlagsDraft((prev) => {
      const current = prev[flagKey];
      if (current === true) return { ...prev, [flagKey]: false };
      if (current === false) {
        const copy = { ...prev };
        delete copy[flagKey];
        return copy;
      }
      return { ...prev, [flagKey]: true };
    });
  };

  const handleLoadAccessConfig = async () => {
    if (!isAdminUser) {
      setAccessError('Apenas administrador pode consultar permissões.');
      return;
    }

    const currentUid = isCanvasEnvironment ? firebaseUser?.uid : saasUser?.uid;
    const resolvedUid = String(targetAccessUid || currentUid || '').trim();
    if (!resolvedUid) {
      setAccessError('Informe um UID válido para carregar.');
      return;
    }

    setAccessInfo('');
    setAccessError('');

    try {
      const accessDocRef = doc(db, 'artifacts', appId, 'users', resolvedUid, 'profile', 'access');
      const snapshot = await getDoc(accessDocRef);
      const data = snapshot.exists() ? snapshot.data() : {};
      const loadedPlan = PLAN_FEATURES[String(data.plan || 'basic').toLowerCase()]
        ? String(data.plan).toLowerCase()
        : 'basic';
      const loadedRole = String(data.role || 'client').toLowerCase() === 'admin' ? 'admin' : 'client';
      const loadedFlags = typeof data.featureFlags === 'object' && data.featureFlags !== null ? data.featureFlags : {};

      setAccessPlanDraft(loadedPlan);
      setAccessRoleDraft(loadedRole);
      setAccessFlagsDraft(loadedFlags);
      setLoadedAccessPlan(loadedPlan);
      setLoadedAccessRole(loadedRole);
      setLoadedAccessUid(resolvedUid);
      setAccessInfo('Acesso do utilizador carregado com sucesso.');
    } catch (error) {
      setAccessError(`Erro ao carregar acesso: ${error.message}`);
    }
  };

  const handleSaveAccessConfig = async () => {
    if (!isAdminUser) {
      setAccessError('Apenas administrador pode alterar plano e permissões.');
      return;
    }

    const currentUid = isCanvasEnvironment ? firebaseUser?.uid : saasUser?.uid;
    const resolvedUid = String(targetAccessUid || currentUid || '').trim();
    if (!resolvedUid) {
      setAccessError('Sessão inválida. Faça login novamente.');
      return;
    }

    setIsSavingAccess(true);
    setAccessInfo('');
    setAccessError('');

    try {
      const normalizedDraftPlan = PLAN_FEATURES[accessPlanDraft] ? accessPlanDraft : 'basic';
      const normalizedDraftRole = accessRoleDraft === 'admin' ? 'admin' : 'client';
      const accessDocRef = doc(db, 'artifacts', appId, 'users', resolvedUid, 'profile', 'access');
      await setDoc(
        accessDocRef,
        {
          plan: normalizedDraftPlan,
          role: normalizedDraftRole,
          featureFlags: accessFlagsDraft,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // Confirma leitura apos escrita para refletir o valor persistido.
      const savedSnapshot = await getDoc(accessDocRef);
      const savedData = savedSnapshot.exists() ? savedSnapshot.data() : {};
      const persistedPlan = PLAN_FEATURES[String(savedData.plan || 'basic').toLowerCase()]
        ? String(savedData.plan).toLowerCase()
        : 'basic';
      const persistedRole = String(savedData.role || 'client').toLowerCase() === 'admin' ? 'admin' : 'client';

      setLoadedAccessPlan(persistedPlan);
      setLoadedAccessRole(persistedRole);
      setLoadedAccessUid(resolvedUid);

      const isEditingCurrentUser = !!currentUid && resolvedUid === currentUid;
      if (isEditingCurrentUser) {
        setUserPlan(persistedPlan);
        setUserRole(persistedRole);
        setFeatureFlags(typeof savedData.featureFlags === 'object' && savedData.featureFlags !== null ? savedData.featureFlags : {});
      }

      setAccessInfo('Configuração de acesso guardada com sucesso.');
    } catch (error) {
      setAccessError(`Erro ao guardar acesso: ${error.message}`);
    } finally {
      setIsSavingAccess(false);
    }
  };

  const handleBudgetChange = (category, value) => {
    setBudgetInfo('');
    setBudgetError('');
    setBudgetDraft((prev) => ({ ...prev, [category]: value }));
  };

  const handleSaveBudgets = async () => {
    if (!hasFeature('budgets.manage')) {
      setBudgetError('Orçamentos por categoria disponíveis apenas no plano Pro.');
      return;
    }

    const uid = isCanvasEnvironment ? firebaseUser?.uid : saasUser?.uid;
    if (!uid) {
      setBudgetError('Sessão inválida. Faça login novamente.');
      return;
    }

    const cleanedLimits = Object.fromEntries(
      Object.entries(budgetDraft).filter(([, value]) => Number(value) > 0).map(([key, value]) => [key, Number(value)])
    );

    setIsSavingBudget(true);
    setBudgetInfo('');
    setBudgetError('');

    try {
      await setDoc(
        doc(db, 'artifacts', appId, 'users', uid, 'profile', 'budgets'),
        { limits: cleanedLimits, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      setBudgetInfo('Orçamentos guardados com sucesso.');
    } catch (error) {
      setBudgetError(`Erro ao guardar orçamentos: ${error.message}`);
    } finally {
      setIsSavingBudget(false);
    }
  };

  const handleAddRecurring = async (e) => {
    e.preventDefault();
    if (!hasFeature('recurring.manage')) {
      setRecurringError('Despesas recorrentes disponíveis apenas no plano Pro.');
      return;
    }

    if (!recurringForm.description || !recurringForm.amount || Number(recurringForm.amount) <= 0) {
      setRecurringError('Preencha descrição e valor para a despesa recorrente.');
      return;
    }

    const uid = isCanvasEnvironment ? firebaseUser?.uid : saasUser?.uid;
    if (!uid) {
      setRecurringError('Sessão inválida. Faça login novamente.');
      return;
    }

    setIsSavingRecurring(true);
    setRecurringInfo('');
    setRecurringError('');

    try {
      const recurringDocRef = doc(collection(db, 'artifacts', appId, 'users', uid, 'recurrings'));
      await setDoc(recurringDocRef, {
        description: recurringForm.description,
        category: recurringForm.category,
        amount: Number(recurringForm.amount),
        frequency: recurringForm.frequency,
        startDate: recurringForm.startDate,
        nextRunDate: recurringForm.startDate,
        active: recurringForm.active,
        createdAt: new Date().toISOString(),
      });

      setRecurringForm((prev) => ({
        ...prev,
        description: '',
        amount: '',
      }));
      setRecurringInfo('Despesa recorrente criada com sucesso.');
    } catch (error) {
      setRecurringError(`Erro ao criar recorrência: ${error.message}`);
    } finally {
      setIsSavingRecurring(false);
    }
  };

  const handleToggleRecurring = async (recurring) => {
    const uid = isCanvasEnvironment ? firebaseUser?.uid : saasUser?.uid;
    if (!uid) return;

    try {
      await updateDoc(doc(db, 'artifacts', appId, 'users', uid, 'recurrings', recurring.id), {
        active: !recurring.active,
      });
      setRecurringInfo(`Recorrência ${!recurring.active ? 'ativada' : 'pausada'} com sucesso.`);
    } catch (error) {
      setRecurringError(`Erro ao atualizar recorrência: ${error.message}`);
    }
  };

  const handleDeleteRecurring = async (recurringId) => {
    const uid = isCanvasEnvironment ? firebaseUser?.uid : saasUser?.uid;
    if (!uid) return;

    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', uid, 'recurrings', recurringId));
      setRecurringInfo('Recorrência removida com sucesso.');
    } catch (error) {
      setRecurringError(`Erro ao remover recorrência: ${error.message}`);
    }
  };

  const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);

  const effectiveSelectedMonth = hasFeature('entries.monthFilter') ? selectedMonth : currentMonth;

  const monthLabel = useMemo(() => {
    const [year, month] = effectiveSelectedMonth.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
  }, [effectiveSelectedMonth]);

  const previousMonth = useMemo(() => {
    const [year, month] = effectiveSelectedMonth.split('-').map(Number);
    const date = new Date(year, month - 2, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }, [effectiveSelectedMonth]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => String(entry.date || '').slice(0, 7) === effectiveSelectedMonth);
  }, [entries, effectiveSelectedMonth]);

  const { totalIncome, totalExpense, balance } = useMemo(() => {
    return filteredEntries.reduce((acc, curr) => {
      if (curr.type === 'Receita') {
        acc.totalIncome += curr.amount;
        acc.balance += curr.amount;
      } else {
        acc.totalExpense += curr.amount;
        acc.balance -= curr.amount;
      }
      return acc;
    }, { totalIncome: 0, totalExpense: 0, balance: 0 });
  }, [filteredEntries]);

  const previousTotals = useMemo(() => {
    return entries
      .filter((entry) => String(entry.date || '').slice(0, 7) === previousMonth)
      .reduce((acc, curr) => {
        if (curr.type === 'Receita') acc.totalIncome += curr.amount;
        else acc.totalExpense += curr.amount;
        return acc;
      }, { totalIncome: 0, totalExpense: 0 });
  }, [entries, previousMonth]);

  const growth = useMemo(() => {
    const calcPercent = (current, previous) => {
      if (previous === 0) return current === 0 ? 0 : 100;
      return ((current - previous) / Math.abs(previous)) * 100;
    };

    return {
      income: calcPercent(totalIncome, previousTotals.totalIncome),
      expense: calcPercent(totalExpense, previousTotals.totalExpense),
    };
  }, [totalIncome, totalExpense, previousTotals]);

  const monthlyTrendData = useMemo(() => {
    const [year, month] = effectiveSelectedMonth.split('-').map(Number);
    const anchor = new Date(year, month - 1, 1);
    const months = [];

    for (let i = 5; i >= 0; i -= 1) {
      const date = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('pt-PT', { month: 'short' });
      months.push({ key, label });
    }

    return months.map((monthItem) => {
      const base = { mes: monthItem.label, receitas: 0, despesas: 0 };
      entries.forEach((entry) => {
        if (String(entry.date || '').slice(0, 7) !== monthItem.key) return;
        if (entry.type === 'Receita') base.receitas += entry.amount;
        else base.despesas += entry.amount;
      });
      return base;
    });
  }, [entries, effectiveSelectedMonth]);

  const expenseByCategoryData = useMemo(() => {
    const grouped = filteredEntries.reduce((acc, entry) => {
      if (entry.type !== 'Despesa') return acc;
      const cat = entry.category || 'Sem categoria';
      acc[cat] = (acc[cat] || 0) + entry.amount;
      return acc;
    }, {});

    const palette = ['#4f46e5', '#059669', '#f59e0b', '#db2777', '#0891b2', '#7c3aed', '#ea580c'];
    return Object.entries(grouped).map(([name, value], index) => ({
      name,
      value,
      color: palette[index % palette.length],
    }));
  }, [filteredEntries]);

  const budgetStatus = useMemo(() => {
    const expenseMap = filteredEntries.reduce((acc, entry) => {
      if (entry.type !== 'Despesa') return acc;
      const category = entry.category || 'Sem categoria';
      acc[category] = (acc[category] || 0) + entry.amount;
      return acc;
    }, {});

    return Object.entries(budgetLimits)
      .filter(([, limit]) => Number(limit) > 0)
      .map(([category, limit]) => {
        const spent = expenseMap[category] || 0;
        const percent = (spent / Number(limit)) * 100;
        return {
          category,
          limit: Number(limit),
          spent,
          percent,
          status: percent >= 100 ? 'danger' : percent >= 80 ? 'warning' : 'safe',
        };
      })
      .sort((a, b) => b.percent - a.percent);
  }, [budgetLimits, filteredEntries]);

  const categoriesForEdit = useMemo(() => {
    const merged = [...categories, editFormData.category].filter(Boolean);
    return [...new Set(merged)];
  }, [categories, editFormData.category]);

  const formatCurrency = (value) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);

  const handleExportCsv = () => {
    if (!hasFeature('reports.export')) {
      setEntryError('Exportação disponível apenas no plano Pro.');
      return;
    }

    if (filteredEntries.length === 0) {
      setEntryError('Sem dados para exportar no mês selecionado.');
      return;
    }

    const header = ['Data', 'Descricao', 'Categoria', 'Tipo', 'Valor'];
    const rows = filteredEntries.map((entry) => [
      new Date(entry.date).toLocaleDateString('pt-PT'),
      String(entry.description || '').replaceAll(';', ','),
      String(entry.category || '').replaceAll(';', ','),
      entry.type,
      String(entry.amount).replace('.', ','),
    ]);

    const csvContent = [header, ...rows].map((row) => row.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `planilhapro-${effectiveSelectedMonth}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setEntryInfo('Relatório CSV exportado com sucesso.');
  };

  const handleExportPdf = () => {
    if (!hasFeature('reports.export')) {
      setEntryError('Exportação disponível apenas no plano Pro.');
      return;
    }

    if (filteredEntries.length === 0) {
      setEntryError('Sem dados para exportar no mês selecionado.');
      return;
    }

    const pdf = new jsPDF();
    pdf.setFontSize(16);
    pdf.text('PlanilhaPRO - Relatório Mensal', 14, 18);
    pdf.setFontSize(11);
    pdf.text(`Periodo: ${monthLabel}`, 14, 26);
    pdf.text(`Receitas: ${formatCurrency(totalIncome)} | Despesas: ${formatCurrency(totalExpense)} | Saldo: ${formatCurrency(balance)}`, 14, 33);

    autoTable(pdf, {
      startY: 40,
      head: [['Data', 'Descricao', 'Categoria', 'Tipo', 'Valor']],
      body: filteredEntries.map((entry) => [
        new Date(entry.date).toLocaleDateString('pt-PT'),
        entry.description,
        entry.category,
        entry.type,
        formatCurrency(entry.amount),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 41, 59] },
    });

    pdf.save(`planilhapro-${effectiveSelectedMonth}.pdf`);
    setEntryInfo('Relatório PDF exportado com sucesso.');
  };

  // --- 5. COMPONENTES VISUAIS ---

  const renderLoginScreen = () => (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="p-2 bg-indigo-600 rounded-lg shadow-md">
            <Wallet className="text-white w-6 h-6" /> 
          </div>
          <h1 className="text-2xl font-bold text-slate-800">PlanilhaPRO</h1>
        </div>
        
        <h2 className="text-xl font-bold text-slate-800 mb-2 text-center">
          {authMode === 'login' ? 'Bem-vindo de volta!' : 'Crie a sua conta SaaS'}
        </h2>
        <p className="text-slate-500 mb-6 text-sm text-center">
          {authMode === 'login' ? 'Aceda à sua gestão financeira na nuvem' : 'Comece a gerir o seu negócio como um profissional'}
        </p>

        {authError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 text-sm rounded-lg flex items-center gap-2">
            <AlertCircle size={16} /> {authError}
          </div>
        )}

        {authInfo && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg">
            {authInfo}
          </div>
        )}

        <form onSubmit={handleAuthSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="email" 
                required 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-10 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50" 
                placeholder="cliente@email.com" 
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Palavra-passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="password" 
                required 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50" 
                placeholder="••••••••" 
                minLength={6}
              />
            </div>
            {authMode === 'login' && (
              <div className="mt-2 text-right">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-indigo-600 font-medium hover:underline"
                >
                  Esqueci a palavra-passe
                </button>
              </div>
            )}
          </div>
          
          <button disabled={isLoadingAuth} type="submit" className="w-full bg-slate-900 text-white font-medium p-3 rounded-lg hover:bg-slate-800 transition mt-2 shadow-md disabled:opacity-70">
            {isLoadingAuth ? 'A processar...' : (authMode === 'login' ? 'Entrar no Sistema' : 'Criar Conta e Aceder')}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          {authMode === 'login' ? 'Ainda não tem acesso? ' : 'Já comprou o acesso? '}
          <button onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); setAuthInfo(''); }} className="text-indigo-600 font-semibold hover:underline">
            {authMode === 'login' ? 'Adquirir Acesso' : 'Fazer Login'}
          </button>
        </div>
      </div>
    </div>
  );

  if (!saasUser) return renderLoginScreen();

  if (isLoadingAccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600">
        A carregar permissões do plano...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans print:bg-white">
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col print:hidden">
        <div className="p-6">
          <h1 className="text-white text-xl font-bold flex items-center gap-2">
            <Wallet className="text-indigo-400" /> PlanilhaPRO
          </h1>
          <p className="text-xs text-slate-500 mt-1">SaaS de Gestão Financeira</p>
          <p className="text-xs mt-2 inline-flex px-2 py-1 rounded-md bg-indigo-500/20 text-indigo-200 uppercase tracking-wide">
            Plano {userPlan}
          </p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'hover:bg-slate-800 hover:text-white'}`}>
            <LayoutDashboard size={20} /> Painel Principal
          </button>
          <button onClick={() => setActiveTab('entries')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === 'entries' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'hover:bg-slate-800 hover:text-white'}`}>
            <Receipt size={20} /> Lançamentos
          </button>
          {isAdminUser && (
            <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'hover:bg-slate-800 hover:text-white'}`}>
              <Settings size={20} /> Configurações
            </button>
          )}
        </nav>
        
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/50 mt-auto">
          <div className="flex flex-col truncate pr-2">
            <span className="text-sm font-medium text-white truncate capitalize">{saasUser.name}</span>
            <span className="text-xs text-slate-500 truncate">{saasUser.email}</span>
          </div>
          <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-rose-500 transition rounded-lg hover:bg-slate-800">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <h2 className="text-2xl font-bold text-slate-800">Painel Principal</h2>
              <div className="flex items-center gap-3">
                {hasFeature('entries.monthFilter') && (
                  <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200">
                    <label className="text-sm font-medium text-slate-600">Mês</label>
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="border border-slate-200 rounded-md p-1.5 text-sm"
                    />
                  </div>
                )}
                <button onClick={handleExportCsv} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition print:hidden">
                  <Download size={18} /> CSV
                </button>
                <button onClick={handleExportPdf} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition print:hidden">
                  <FileText size={18} /> PDF
                </button>
              </div>
            </div>
            <p className="text-slate-500 text-sm">Visão de {monthLabel}</p>
            {!hasFeature('reports.export') && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                Exportação CSV/PDF disponível no plano Pro.
              </div>
            )}
            {hasFeature('budgets.alerts') && budgetStatus.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
                <h3 className="text-base font-bold text-slate-800">Alertas de Orçamento</h3>
                {budgetStatus.map((item) => (
                  <div key={item.category} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-700 font-medium">{item.category}</span>
                      <span className={item.status === 'danger' ? 'text-rose-600 font-semibold' : item.status === 'warning' ? 'text-amber-600 font-semibold' : 'text-emerald-600 font-semibold'}>
                        {item.percent.toFixed(0)}% ({formatCurrency(item.spent)} / {formatCurrency(item.limit)})
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.status === 'danger' ? 'bg-rose-500' : item.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(item.percent, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <div className="flex justify-between items-start"><span className="text-slate-500 font-medium">Receitas Totais</span><div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><TrendingUp size={20} /></div></div>
                <span className="text-3xl font-bold text-slate-800 mt-4">{formatCurrency(totalIncome)}</span>
                {hasFeature('dashboard.growth') && (
                  <span className={`text-xs mt-2 font-semibold ${growth.income >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {growth.income >= 0 ? '▲' : '▼'} {Math.abs(growth.income).toFixed(1)}% vs mês anterior
                  </span>
                )}
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <div className="flex justify-between items-start"><span className="text-slate-500 font-medium">Despesas Totais</span><div className="p-2 bg-rose-100 text-rose-600 rounded-lg"><TrendingDown size={20} /></div></div>
                <span className="text-3xl font-bold text-slate-800 mt-4">{formatCurrency(totalExpense)}</span>
                {hasFeature('dashboard.growth') && (
                  <span className={`text-xs mt-2 font-semibold ${growth.expense <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {growth.expense <= 0 ? '▼' : '▲'} {Math.abs(growth.expense).toFixed(1)}% vs mês anterior
                  </span>
                )}
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <div className="flex justify-between items-start"><span className="text-slate-500 font-medium">Saldo Atual</span><div className={`p-2 rounded-lg ${balance >= 0 ? 'bg-indigo-100 text-indigo-600' : 'bg-rose-100 text-rose-600'}`}><Wallet size={20} /></div></div>
                <span className={`text-3xl font-bold mt-4 ${balance >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>{formatCurrency(balance)}</span>
              </div>
            </div>

            {hasFeature('dashboard.charts') ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Despesas por Categoria</h3>
                  <div className="h-72">
                    {expenseByCategoryData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-slate-500 text-sm">Sem despesas no mês selecionado.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={expenseByCategoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} label>
                            {expenseByCategoryData.map((item) => (
                              <Cell key={item.name} fill={item.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Receitas vs Despesas (6 meses)</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyTrendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="mes" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Legend />
                        <Bar dataKey="receitas" fill="#059669" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="despesas" fill="#dc2626" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 text-indigo-900">
                Gráficos avançados disponíveis no plano Pro.
              </div>
            )}
          </div>
        )}

        {activeTab === 'entries' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <h2 className="text-2xl font-bold text-slate-800">Gestão de Lançamentos</h2>
              {hasFeature('entries.monthFilter') && (
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 w-fit">
                  <label className="text-sm font-medium text-slate-600">Mês</label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="border border-slate-200 rounded-md p-1.5 text-sm"
                  />
                </div>
              )}
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><PlusCircle size={20} className="text-indigo-600"/> Novo Registo</h3>

              {entryError && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg flex items-center gap-2">
                  <AlertCircle size={16} /> {entryError}
                </div>
              )}

              {entryInfo && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg">
                  {entryInfo}
                </div>
              )}

              <form onSubmit={handleAddEntry} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                <div className="md:col-span-1"><label className="block text-sm font-medium text-slate-600 mb-1">Data</label><input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-600 mb-1">Descrição</label><input type="text" placeholder="Ex: Pagamento Cliente X" required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                <div className="md:col-span-1"><label className="block text-sm font-medium text-slate-600 mb-1">Tipo</label><select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"><option value="Receita">Receita</option><option value="Despesa">Despesa</option></select></div>
                <div className="md:col-span-1"><label className="block text-sm font-medium text-slate-600 mb-1">Categoria</label><select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">{categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
                <div className="md:col-span-1"><label className="block text-sm font-medium text-slate-600 mb-1">Valor (€)</label><input type="number" step="0.01" min="0" required value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                <div className="md:col-span-6 flex justify-end mt-2"><button disabled={isSavingEntry} type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-70">{isSavingEntry ? 'A guardar...' : 'Guardar Registo'}</button></div>
              </form>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead><tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm"><th className="p-4 font-medium">Data</th><th className="p-4 font-medium">Descrição</th><th className="p-4 font-medium">Categoria</th><th className="p-4 font-medium">Tipo</th><th className="p-4 font-medium text-right">Valor</th><th className="p-4 font-medium text-center">Ações</th></tr></thead>
                  <tbody>
                    {filteredEntries.length === 0 ? (<tr><td colSpan="6" className="p-8 text-center text-slate-500">Nenhum registo encontrado para {monthLabel}.</td></tr>) : (
                      filteredEntries.map(entry => (
                        <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                          {editingEntryId === entry.id ? (
                            <>
                              <td className="p-2"><input type="date" value={editFormData.date} onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })} className="w-full p-2 border border-slate-300 rounded-lg" /></td>
                              <td className="p-2"><input type="text" value={editFormData.description} onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })} className="w-full p-2 border border-slate-300 rounded-lg" /></td>
                              <td className="p-2"><select value={editFormData.category} onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })} className="w-full p-2 border border-slate-300 rounded-lg">{categoriesForEdit.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></td>
                              <td className="p-2"><select value={editFormData.type} onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })} className="w-full p-2 border border-slate-300 rounded-lg"><option value="Receita">Receita</option><option value="Despesa">Despesa</option></select></td>
                              <td className="p-2"><input type="number" min="0" step="0.01" value={editFormData.amount} onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })} className="w-full p-2 border border-slate-300 rounded-lg text-right" /></td>
                              <td className="p-2 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button onClick={handleSaveEdit} disabled={isSavingEdit} className="text-emerald-600 hover:text-emerald-700 disabled:opacity-60" title="Guardar edição"><Save size={18} /></button>
                                  <button onClick={handleCancelEdit} className="text-slate-500 hover:text-slate-700" title="Cancelar"><X size={18} /></button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="p-4 text-slate-800">{new Date(entry.date).toLocaleDateString('pt-PT')}</td>
                              <td className="p-4 text-slate-800">{entry.description}</td>
                              <td className="p-4 text-slate-600 text-sm"><span className="bg-slate-100 px-2 py-1 rounded-md">{entry.category}</span></td>
                              <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${entry.type === 'Receita' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{entry.type}</span></td>
                              <td className={`p-4 text-right font-medium ${entry.type === 'Receita' ? 'text-emerald-600' : 'text-rose-600'}`}>{entry.type === 'Receita' ? '+' : '-'}{formatCurrency(entry.amount)}</td>
                              <td className="p-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {hasFeature('entries.edit') && (
                                    <button onClick={() => handleStartEdit(entry)} className="text-slate-400 hover:text-indigo-600 transition" title="Editar"><Pencil size={18} /></button>
                                  )}
                                  <button onClick={() => handleDeleteEntry(entry.id)} className="text-slate-400 hover:text-rose-600 transition" title="Remover"><Trash2 size={18} /></button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && isAdminUser && (
          <div className="space-y-6 animate-in fade-in duration-500 max-w-2xl">
            <h2 className="text-2xl font-bold text-slate-800">Configurações do Sistema</h2>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Gerir Categorias</h3>
              <form onSubmit={handleAddCategory} className="flex gap-4 mb-6">
                <input type="text" placeholder="Nova categoria..." value={newCategory} onChange={e => setNewCategory(e.target.value)} className="flex-1 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                <button type="submit" className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition">Adicionar</button>
              </form>
              <div className="space-y-2">
                {categories.map((cat, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="text-slate-700 font-medium">{cat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Orçamentos por Categoria</h3>

              {!hasFeature('budgets.manage') ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  Esta funcionalidade está disponível no plano Pro.
                </div>
              ) : (
                <>
                  {budgetError && (
                    <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg">{budgetError}</div>
                  )}
                  {budgetInfo && (
                    <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg">{budgetInfo}</div>
                  )}

                  <div className="space-y-3">
                    {categories.map((category) => (
                      <div key={category} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                        <span className="text-slate-700 font-medium">{category}</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={budgetDraft[category] ?? ''}
                          onChange={(e) => handleBudgetChange(category, e.target.value)}
                          className="md:col-span-2 p-2 border border-slate-300 rounded-lg"
                          placeholder="Limite mensal em EUR"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end mt-5">
                    <button onClick={handleSaveBudgets} disabled={isSavingBudget} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-70">
                      {isSavingBudget ? 'A guardar...' : 'Guardar Orçamentos'}
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Despesas Recorrentes</h3>

              {!hasFeature('recurring.manage') ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  Despesas recorrentes disponíveis no plano Pro.
                </div>
              ) : (
                <>
                  {recurringError && (
                    <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg">{recurringError}</div>
                  )}
                  {recurringInfo && (
                    <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg">{recurringInfo}</div>
                  )}

                  <form onSubmit={handleAddRecurring} className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                    <input
                      type="text"
                      value={recurringForm.description}
                      onChange={(e) => setRecurringForm((prev) => ({ ...prev, description: e.target.value }))}
                      className="p-2 border border-slate-300 rounded-lg"
                      placeholder="Descrição da despesa recorrente"
                    />
                    <select
                      value={recurringForm.category}
                      onChange={(e) => setRecurringForm((prev) => ({ ...prev, category: e.target.value }))}
                      className="p-2 border border-slate-300 rounded-lg"
                    >
                      {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={recurringForm.amount}
                      onChange={(e) => setRecurringForm((prev) => ({ ...prev, amount: e.target.value }))}
                      className="p-2 border border-slate-300 rounded-lg"
                      placeholder="Valor mensal/semanal"
                    />
                    <select
                      value={recurringForm.frequency}
                      onChange={(e) => setRecurringForm((prev) => ({ ...prev, frequency: e.target.value }))}
                      className="p-2 border border-slate-300 rounded-lg"
                    >
                      <option value="monthly">Mensal</option>
                      <option value="weekly">Semanal</option>
                    </select>
                    <input
                      type="date"
                      value={recurringForm.startDate}
                      onChange={(e) => setRecurringForm((prev) => ({ ...prev, startDate: e.target.value }))}
                      className="p-2 border border-slate-300 rounded-lg"
                    />
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={recurringForm.active}
                        onChange={(e) => setRecurringForm((prev) => ({ ...prev, active: e.target.checked }))}
                      />
                      Ativa
                    </label>
                    <div className="md:col-span-2 flex justify-end">
                      <button type="submit" disabled={isSavingRecurring} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-70">
                        {isSavingRecurring ? 'A guardar...' : 'Adicionar Recorrência'}
                      </button>
                    </div>
                  </form>

                  <div className="space-y-3">
                    {recurringItems.length === 0 ? (
                      <p className="text-sm text-slate-500">Nenhuma recorrência configurada.</p>
                    ) : (
                      recurringItems.map((item) => (
                        <div key={item.id} className="p-3 border border-slate-200 rounded-lg bg-slate-50 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-800">{item.description}</p>
                            <p className="text-sm text-slate-600">{item.frequency === 'weekly' ? 'Semanal' : 'Mensal'} | {item.category} | {formatCurrency(Number(item.amount || 0))}</p>
                            <p className="text-xs text-slate-500">Próxima execução: {item.nextRunDate || item.startDate}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleToggleRecurring(item)} className={`px-3 py-1 rounded-md text-sm ${item.active ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {item.active ? 'Pausar' : 'Ativar'}
                            </button>
                            <button onClick={() => handleDeleteRecurring(item.id)} className="p-2 text-rose-600 hover:bg-rose-100 rounded-md" title="Remover recorrência">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {isAdminUser && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Admin de Acesso (Utilizador Atual)</h3>
              <p className="text-sm text-slate-600 mb-4">UID carregado: <span className="font-semibold">{loadedAccessUid || '-'}</span> | Plano: <span className="font-semibold uppercase">{loadedAccessPlan}</span> | Role: <span className="font-semibold uppercase">{loadedAccessRole}</span></p>

              {accessError && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg">{accessError}</div>
              )}
              {accessInfo && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg">{accessInfo}</div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">UID do utilizador</label>
                <div className="flex gap-2">
                  <input value={targetAccessUid} onChange={(e) => setTargetAccessUid(e.target.value)} className="flex-1 p-2 border border-slate-300 rounded-lg" placeholder="Cole aqui o UID do utilizador" />
                  <button onClick={handleLoadAccessConfig} className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50">Carregar</button>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Plano</label>
                <select value={accessPlanDraft} onChange={(e) => setAccessPlanDraft(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg">
                  <option value="basic">basic</option>
                  <option value="pro">pro</option>
                  <option value="enterprise">enterprise</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
                <select value={accessRoleDraft} onChange={(e) => setAccessRoleDraft(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg">
                  <option value="client">client</option>
                  <option value="admin">admin</option>
                </select>
              </div>

              <div className="space-y-2 mb-5">
                <p className="text-sm font-medium text-slate-700">Feature Flags (ciclo: default - ligado - desligado)</p>
                {FEATURE_KEYS.map((flagKey) => {
                  const flagValue = accessFlagsDraft[flagKey];
                  const statusText = flagValue === true ? 'Ligado' : flagValue === false ? 'Desligado' : 'Default';
                  const statusClass = flagValue === true
                    ? 'bg-emerald-100 text-emerald-700'
                    : flagValue === false
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-slate-100 text-slate-700';

                  return (
                    <button key={flagKey} onClick={() => handleToggleAccessFlag(flagKey)} className="w-full flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 text-left">
                      <span className="text-sm text-slate-700">{flagKey}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${statusClass}`}>{statusText}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end">
                <button onClick={handleSaveAccessConfig} disabled={isSavingAccess} className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition disabled:opacity-70">
                  {isSavingAccess ? 'A guardar...' : 'Guardar Acesso'}
                </button>
              </div>
            </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
