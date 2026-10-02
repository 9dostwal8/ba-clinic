// @ts-nocheck
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface LanguageContextType {
  language: 'en' | 'ar' | 'ckb';
  isRTL: boolean;
  setLanguage: (lang: 'en' | 'ar' | 'ckb') => void;
  t: (key: string) => string;
  reloadTranslations: () => Promise<void>;
  availableLanguages: { code: string; name: string; isRTL: boolean; isEnabled: boolean }[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  en: {
    appName: 'Clinic Management System',
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
    email: 'Email',
    password: 'Password',
    forgotPassword: 'Forgot Password?',
    dontHaveAccount: "Don't have an account?",
    alreadyHaveAccount: 'Already have an account?',
    clinicRegistration: 'Clinic Registration',
    clinicName: 'Clinic Name',
    clinicNameArabic: 'Clinic Name (Arabic)',
    phone: 'Phone Number',
    address: 'Address',
    adminName: 'Admin Name',
    adminNameArabic: 'Admin Name (Arabic)',
    confirmPassword: 'Confirm Password',
    registerClinic: 'Register Clinic',
    loggingIn: 'Logging in...',
    registering: 'Registering...',
    welcome: 'Welcome',
    dashboard: 'Dashboard',
    patients: 'Patients',
    appointments: 'Appointments',
    treatments: 'Treatments',
    invoices: 'Invoices',
    inventory: 'Inventory',
    staff: 'Staff',
    settings: 'Settings',
    accounting: 'Accounting',
    clinics: 'Clinics',
    subscriptions: 'Subscriptions',
    superAdminDashboard: 'Super Admin Dashboard',
    clinicDashboard: 'Clinic Dashboard',
    overview: 'Overview',
    totalClinics: 'Total Clinics',
    activeClinics: 'Active Clinics',
    suspended: 'Suspended',
    revenue: 'Revenue',
    revenueIQD: 'Revenue (IQD)',
    subscriptionManagement: 'Subscription Management',
    clinic: 'Clinic',
    contact: 'Contact',
    status: 'Status',
    expires: 'Expires',
    actions: 'Actions',
    viewDetails: 'View Details',
    renewSubscription: 'Renew Subscription',
    pauseSubscription: 'Pause Subscription',
    resumeSubscription: 'Resume Subscription',
    blockClinic: 'Block Clinic',
    unblockClinic: 'Unblock Clinic',
    clinicDetails: 'Clinic Details',
    clinicName_: 'Clinic Name',
    contactInformation: 'Contact Information',
    subscriptionStatus: 'Subscription Status',
    subscriptionPeriod: 'Subscription Period',
    start: 'Start',
    end: 'End',
    registrationDate: 'Registration Date',
    usageStatistics: 'Usage Statistics',
    staffUsers: 'Staff Users',
    quickActions: 'Quick Actions',
    close: 'Close',
    cancel: 'Cancel',
    confirm: 'Confirm',
    confirmRenewal: 'Confirm Renewal',
    renewalPeriod: 'Renewal Period (Months)',
    months: 'Months',
    month: 'month',
    newExpiryDate: 'New Expiry Date',
    currentExpiryDate: 'Current Expiry Date',
    daysRemaining: 'days remaining',
    expired: 'Expired',
    daysAgo: 'days ago',
    expiresIn: 'Expires in',
    expiredAgo: 'Expired',
    loading: 'Loading...',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    filter: 'Filter',
    export: 'Export',
    import: 'Import',
    print: 'Print',
    today: 'Today',
    yesterday: 'Yesterday',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
    active: 'Active',
    inactive: 'Inactive',
    pending: 'Pending',
    completed: 'Completed',
    cancelled: 'Cancelled',
    totalPatients: 'Total Patients',
    todaysAppointments: "Today's Appointments",
    pendingInvoices: 'Pending Invoices',
    monthlyRevenue: 'Monthly Revenue',
    recentAppointments: 'Recent Appointments',
    patientName: 'Patient Name',
    doctorName: 'Doctor Name',
    date: 'Date',
    time: 'Time',
    viewAll: 'View All',
    noData: 'No data available',
    backupDatabase: 'Backup Database',
    restoreDatabase: 'Restore Database',
    downloadBackup: 'Download Backup',
    uploadBackup: 'Upload Backup',
    creatingBackup: 'Creating Backup...',
    restoring: 'Restoring...',
    backupSuccess: 'Backup downloaded successfully',
    restoreSuccess: 'Restore completed successfully',
    backupDescription: 'Download a complete backup of all clinics, users, patients, appointments, and other data in JSON format.',
    restoreDescription: 'Import a previously downloaded backup file. This will merge data with existing records.',
    importantNotes: 'Important Notes:',
    backupNote1: 'Backups include all data from all clinics in the system',
    backupNote2: 'Restore operations will merge data with existing records using upsert',
    backupNote3: 'Records with the same ID will be updated with backup data',
    backupNote4: 'Keep your backup files secure as they contain sensitive information',
    backupNote5: 'Regular backups are recommended before major system changes',
    languageSettings: 'Language Settings',
    languageManagement: 'Language Management',
    enableArabic: 'Enable Arabic Language',
    enableEnglish: 'Enable English Language',
    currentLanguage: 'Current Language',
    switchLanguage: 'Switch Language',
    english: 'English',
    arabic: 'Arabic',
    rtlSupport: 'Right-to-Left (RTL) Support',
    languageEnabled: 'Language Enabled',
    languageDisabled: 'Language Disabled',
    heroTitle: 'Modern Clinic Management System',
    heroSubtitle: 'Streamline your dental practice with our comprehensive management platform',
    getStarted: 'Get Started',
    learnMore: 'Learn More',
    featuresTitle: 'Everything You Need to Manage Your Clinic',
    featurePatientManagement: 'Patient Management',
    featurePatientManagementDesc: 'Comprehensive patient records, medical history, and treatment tracking',
    featureAppointmentScheduling: 'Appointment Scheduling',
    featureAppointmentSchedulingDesc: 'Easy-to-use calendar system with automated reminders',
    featureBilling: 'Billing & Invoicing',
    featureBillingDesc: 'Generate invoices, track payments, and manage clinic finances',
    featureInventory: 'Inventory Management',
    featureInventoryDesc: 'Track supplies, manage stock levels, and automate reordering',
    featureReports: 'Reports & Analytics',
    featureReportsDesc: 'Detailed insights into clinic performance and patient trends',
    featureSecurity: 'Secure & Compliant',
    featureSecurityDesc: 'Bank-level encryption and HIPAA-compliant data storage',
    pricingTitle: 'Simple, Transparent Pricing',
    pricingMonthly: 'per month',
    pricingFeatures: 'Everything Included:',
    pricingUnlimitedPatients: 'Unlimited patients',
    pricingUnlimitedAppointments: 'Unlimited appointments',
    pricingInventoryManagement: 'Inventory management',
    pricingReportsAnalytics: 'Reports & analytics',
    pricingMultiUserAccess: 'Multi-user access',
    pricingSupportUpdates: '24/7 support & updates',
    ctaTitle: 'Ready to Transform Your Clinic?',
    ctaSubtitle: 'Join hundreds of dental clinics using our platform',
    footer: '© 2024 Clinic Management System. All rights reserved.',
    backToHome: 'Back to Home',
    signInToAccount: 'Sign in to your account',
    dentalClinicManager: 'Dental Clinic Manager',
    emailAddress: 'Email Address',
    emailPlaceholder: 'you@example.com',
    newPatient: 'New Patient',
    patientList: 'Patient List',
    addPatient: 'Add Patient',
    editPatient: 'Edit Patient',
    deletePatient: 'Delete Patient',
    fullName: 'Full Name',
    fullNameArabic: 'Full Name (Arabic)',
    gender: 'Gender',
    male: 'Male',
    female: 'Female',
    dateOfBirth: 'Date of Birth',
    medicalHistory: 'Medical History',
    notes: 'Notes',
    newAppointment: 'New Appointment',
    selectPatient: 'Select Patient',
    selectDoctor: 'Select Doctor',
    appointmentDate: 'Appointment Date',
    appointmentTime: 'Appointment Time',
    duration: 'Duration',
    minutes: 'minutes',
    reason: 'Reason',
    newTreatment: 'New Treatment',
    treatmentType: 'Treatment Type',
    description: 'Description',
    cost: 'Cost',
    treatmentDate: 'Treatment Date',
    newInvoice: 'New Invoice',
    invoiceNumber: 'Invoice Number',
    amount: 'Amount',
    paid: 'Paid',
    unpaid: 'Unpaid',
    dueDate: 'Due Date',
    paymentStatus: 'Payment Status',
    newStaff: 'New Staff',
    staffList: 'Staff List',
    role: 'Role',
    doctor: 'Doctor',
    dentist: 'Dentist',
    assistant: 'Assistant',
    receptionist: 'Receptionist',
    newInventoryItem: 'New Inventory Item',
    itemName: 'Item Name',
    itemNameArabic: 'Item Name (Arabic)',
    quantity: 'Quantity',
    unit: 'Unit',
    reorderLevel: 'Reorder Level',
    supplier: 'Supplier',
    lastUpdated: 'Last Updated',
    updateQuantity: 'Update Quantity',
    accountingOverview: 'Accounting Overview',
    totalIncome: 'Total Income',
    totalExpenses: 'Total Expenses',
    netProfit: 'Net Profit',
    thisYear: 'This Year',
    recentTransactions: 'Recent Transactions',
    type: 'Type',
    income: 'Income',
    expense: 'Expense',
    category: 'Category',
    profileSettings: 'Profile Settings',
    clinicSettings: 'Clinic Settings',
    changePassword: 'Change Password',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    updateProfile: 'Update Profile',
    updateSettings: 'Update Settings',
    subscriptionInfo: 'Subscription Information',
    plan: 'Plan',
    billingCycle: 'Billing Cycle',
    nextBillingDate: 'Next Billing Date',
    manageBilling: 'Manage Billing',
    areYouSure: 'Are you sure?',
    deleteConfirmation: 'This action cannot be undone.',
    yesDelete: 'Yes, Delete',
    successMessage: 'Operation completed successfully',
    errorMessage: 'An error occurred. Please try again.',
    requiredField: 'This field is required',
    invalidEmail: 'Invalid email address',
    passwordMismatch: 'Passwords do not match',
    selectOption: 'Select an option',
    bloodType: 'Blood Type',
    allergies: 'Allergies',
    checkup: 'Checkup',
    consultation: 'Consultation',
    followUp: 'Follow Up',
    emergency: 'Emergency',
    confirmed: 'Confirmed',
    noShow: 'No Show',
    viewAppointment: 'View Appointment',
    appointmentDetails: 'Appointment Details',
    appointmentStatus: 'Appointment Status',
    markAsCompleted: 'Mark as Completed',
    markAsCancelled: 'Mark as Cancelled',
    prescriptions: 'Prescriptions',
    treatmentPlan: 'Treatment Plan',
    price: 'Price',
    priceArabic: 'Price (Arabic)',
    treatmentName: 'Treatment Name',
    treatmentNameArabic: 'Treatment Name (Arabic)',
    itemDetails: 'Item Details',
    stockAlert: 'Stock Alert',
    lowStock: 'Low Stock',
    inStock: 'In Stock',
    outOfStock: 'Out of Stock',
    addToInventory: 'Add to Inventory',
    removeFromInventory: 'Remove from Inventory',
    financialReport: 'Financial Report',
    totalRevenue: 'Total Revenue',
    profitMargin: 'Profit Margin',
    expenseReport: 'Expense Report',
    payNow: 'Pay Now',
    printInvoice: 'Print Invoice',
    downloadInvoice: 'Download Invoice',
    sendInvoice: 'Send Invoice',
    partiallyPaid: 'Partially Paid',
    overdue: 'Overdue',
    addStaffMember: 'Add Staff Member',
    editStaffMember: 'Edit Staff Member',
    staffDetails: 'Staff Details',
    permissions: 'Permissions',
    workSchedule: 'Work Schedule',
    emailNotifications: 'Email Notifications',
    smsNotifications: 'SMS Notifications',
    systemSettings: 'System Settings',
    notificationSettings: 'Notification Settings',
    securitySettings: 'Security Settings',
    clinicInformation: 'Clinic Information',
    workingHours: 'Working Hours',
    timezone: 'Timezone',
    currency: 'Currency',
    translations: 'Translations',
  },
  ar: {
    appName: 'نظام إدارة العيادات',
    login: 'تسجيل الدخول',
    register: 'التسجيل',
    logout: 'تسجيل الخروج',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    forgotPassword: 'نسيت كلمة المرور؟',
    dontHaveAccount: 'ليس لديك حساب؟',
    alreadyHaveAccount: 'لديك حساب بالفعل؟',
    clinicRegistration: 'تسجيل العيادة',
    clinicName: 'اسم العيادة',
    clinicNameArabic: 'اسم العيادة (بالعربية)',
    phone: 'رقم الهاتف',
    address: 'العنوان',
    adminName: 'اسم المسؤول',
    adminNameArabic: 'اسم المسؤول (بالعربية)',
    confirmPassword: 'تأكيد كلمة المرور',
    registerClinic: 'تسجيل العيادة',
    loggingIn: 'جاري تسجيل الدخول...',
    registering: 'جاري التسجيل...',
    welcome: 'مرحباً',
    dashboard: 'لوحة التحكم',
    patients: 'المرضى',
    appointments: 'المواعيد',
    treatments: 'العلاجات',
    invoices: 'الفواتير',
    inventory: 'المخزون',
    staff: 'الموظفين',
    settings: 'الإعدادات',
    accounting: 'المحاسبة',
    clinics: 'العيادات',
    subscriptions: 'الاشتراكات',
    superAdminDashboard: 'لوحة المسؤول الرئيسي',
    clinicDashboard: 'لوحة العيادة',
    overview: 'نظرة عامة',
    totalClinics: 'إجمالي العيادات',
    activeClinics: 'العيادات النشطة',
    suspended: 'معلقة',
    revenue: 'الإيرادات',
    revenueIQD: 'الإيرادات (دينار)',
    subscriptionManagement: 'إدارة الاشتراكات',
    clinic: 'العيادة',
    contact: 'جهة الاتصال',
    status: 'الحالة',
    expires: 'تنتهي في',
    actions: 'الإجراءات',
    viewDetails: 'عرض التفاصيل',
    renewSubscription: 'تجديد الاشتراك',
    pauseSubscription: 'إيقاف الاشتراك',
    resumeSubscription: 'استئناف الاشتراك',
    blockClinic: 'حظر العيادة',
    unblockClinic: 'إلغاء حظر العيادة',
    clinicDetails: 'تفاصيل العيادة',
    clinicName_: 'اسم العيادة',
    contactInformation: 'معلومات الاتصال',
    subscriptionStatus: 'حالة الاشتراك',
    subscriptionPeriod: 'فترة الاشتراك',
    start: 'البداية',
    end: 'النهاية',
    registrationDate: 'تاريخ التسجيل',
    usageStatistics: 'إحصائيات الاستخدام',
    staffUsers: 'المستخدمين الموظفين',
    quickActions: 'إجراءات سريعة',
    close: 'إغلاق',
    cancel: 'إلغاء',
    confirm: 'تأكيد',
    confirmRenewal: 'تأكيد التجديد',
    renewalPeriod: 'فترة التجديد (أشهر)',
    months: 'أشهر',
    month: 'شهر',
    newExpiryDate: 'تاريخ الانتهاء الجديد',
    currentExpiryDate: 'تاريخ الانتهاء الحالي',
    daysRemaining: 'يوم متبقي',
    expired: 'منتهية',
    daysAgo: 'يوم مضى',
    expiresIn: 'تنتهي في',
    expiredAgo: 'انتهت منذ',
    loading: 'جاري التحميل...',
    save: 'حفظ',
    delete: 'حذف',
    edit: 'تعديل',
    add: 'إضافة',
    search: 'بحث',
    filter: 'تصفية',
    export: 'تصدير',
    import: 'استيراد',
    print: 'طباعة',
    today: 'اليوم',
    yesterday: 'أمس',
    thisWeek: 'هذا الأسبوع',
    thisMonth: 'هذا الشهر',
    active: 'نشط',
    inactive: 'غير نشط',
    pending: 'قيد الانتظار',
    completed: 'مكتمل',
    cancelled: 'ملغى',
    totalPatients: 'إجمالي المرضى',
    todaysAppointments: 'مواعيد اليوم',
    pendingInvoices: 'الفواتير المعلقة',
    monthlyRevenue: 'الإيرادات الشهرية',
    recentAppointments: 'المواعيد الأخيرة',
    patientName: 'اسم المريض',
    doctorName: 'اسم الطبيب',
    date: 'التاريخ',
    time: 'الوقت',
    viewAll: 'عرض الكل',
    noData: 'لا توجد بيانات',
    backupDatabase: 'نسخ احتياطي للبيانات',
    restoreDatabase: 'استعادة البيانات',
    downloadBackup: 'تحميل النسخة الاحتياطية',
    uploadBackup: 'رفع النسخة الاحتياطية',
    creatingBackup: 'جاري إنشاء النسخة الاحتياطية...',
    restoring: 'جاري الاستعادة...',
    backupSuccess: 'تم تحميل النسخة الاحتياطية بنجاح',
    restoreSuccess: 'تمت الاستعادة بنجاح',
    backupDescription: 'تحميل نسخة احتياطية كاملة من جميع العيادات والمستخدمين والمرضى والمواعيد والبيانات الأخرى بصيغة JSON.',
    restoreDescription: 'استيراد ملف نسخة احتياطية تم تحميله مسبقاً. سيتم دمج البيانات مع السجلات الموجودة.',
    importantNotes: 'ملاحظات هامة:',
    backupNote1: 'تتضمن النسخ الاحتياطية جميع البيانات من جميع العيادات في النظام',
    backupNote2: 'ستقوم عمليات الاستعادة بدمج البيانات مع السجلات الموجودة',
    backupNote3: 'سيتم تحديث السجلات التي لها نفس المعرف ببيانات النسخة الاحتياطية',
    backupNote4: 'احتفظ بملفات النسخ الاحتياطية آمنة لأنها تحتوي على معلومات حساسة',
    backupNote5: 'يوصى بإجراء نسخ احتياطية منتظمة قبل إجراء تغييرات كبيرة على النظام',
    languageSettings: 'إعدادات اللغة',
    languageManagement: 'إدارة اللغات',
    enableArabic: 'تفعيل اللغة العربية',
    enableEnglish: 'تفعيل اللغة الإنجليزية',
    currentLanguage: 'اللغة الحالية',
    switchLanguage: 'تبديل اللغة',
    english: 'الإنجليزية',
    arabic: 'العربية',
    rtlSupport: 'دعم الكتابة من اليمين إلى اليسار',
    languageEnabled: 'تم تفعيل اللغة',
    languageDisabled: 'تم تعطيل اللغة',
    heroTitle: 'نظام إدارة عيادات حديث',
    heroSubtitle: 'قم بتبسيط إدارة عيادتك باستخدام منصتنا الشاملة',
    getStarted: 'ابدأ الآن',
    learnMore: 'معرفة المزيد',
    featuresTitle: 'كل ما تحتاجه لإدارة عيادتك',
    featurePatientManagement: 'إدارة المرضى',
    featurePatientManagementDesc: 'سجلات شاملة للمرضى والتاريخ الطبي ومتابعة العلاج',
    featureAppointmentScheduling: 'جدولة المواعيد',
    featureAppointmentSchedulingDesc: 'نظام تقويم سهل الاستخدام مع تذكيرات تلقائية',
    featureBilling: 'الفوترة والمحاسبة',
    featureBillingDesc: 'إنشاء الفواتير وتتبع المدفوعات وإدارة مالية العيادة',
    featureInventory: 'إدارة المخزون',
    featureInventoryDesc: 'تتبع الإمدادات وإدارة مستويات المخزون وإعادة الطلب التلقائي',
    featureReports: 'التقارير والتحليلات',
    featureReportsDesc: 'رؤى تفصيلية حول أداء العيادة واتجاهات المرضى',
    featureSecurity: 'آمن ومتوافق',
    featureSecurityDesc: 'تشفير على مستوى البنوك وتخزين بيانات متوافق مع المعايير',
    pricingTitle: 'تسعير بسيط وشفاف',
    pricingMonthly: 'شهرياً',
    pricingFeatures: 'كل شيء متضمن:',
    pricingUnlimitedPatients: 'مرضى غير محدودين',
    pricingUnlimitedAppointments: 'مواعيد غير محدودة',
    pricingInventoryManagement: 'إدارة المخزون',
    pricingReportsAnalytics: 'التقارير والتحليلات',
    pricingMultiUserAccess: 'وصول متعدد المستخدمين',
    pricingSupportUpdates: 'دعم وتحديثات على مدار الساعة',
    ctaTitle: 'هل أنت مستعد لتحويل عيادتك؟',
    ctaSubtitle: 'انضم إلى مئات عيادات الأسنان التي تستخدم منصتنا',
    footer: '© 2024 نظام إدارة العيادات. جميع الحقوق محفوظة.',
    backToHome: 'العودة للرئيسية',
    signInToAccount: 'تسجيل الدخول إلى حسابك',
    dentalClinicManager: 'مدير عيادة الأسنان',
    emailAddress: 'عنوان البريد الإلكتروني',
    emailPlaceholder: 'you@example.com',
    newPatient: 'مريض جديد',
    patientList: 'قائمة المرضى',
    addPatient: 'إضافة مريض',
    editPatient: 'تعديل المريض',
    deletePatient: 'حذف المريض',
    fullName: 'الاسم الكامل',
    fullNameArabic: 'الاسم الكامل (بالعربية)',
    gender: 'الجنس',
    male: 'ذكر',
    female: 'أنثى',
    dateOfBirth: 'تاريخ الميلاد',
    medicalHistory: 'التاريخ الطبي',
    notes: 'ملاحظات',
    newAppointment: 'موعد جديد',
    selectPatient: 'اختر المريض',
    selectDoctor: 'اختر الطبيب',
    appointmentDate: 'تاريخ الموعد',
    appointmentTime: 'وقت الموعد',
    duration: 'المدة',
    minutes: 'دقيقة',
    reason: 'السبب',
    newTreatment: 'علاج جديد',
    treatmentType: 'نوع العلاج',
    description: 'الوصف',
    cost: 'التكلفة',
    treatmentDate: 'تاريخ العلاج',
    newInvoice: 'فاتورة جديدة',
    invoiceNumber: 'رقم الفاتورة',
    amount: 'المبلغ',
    paid: 'مدفوع',
    unpaid: 'غير مدفوع',
    dueDate: 'تاريخ الاستحقاق',
    paymentStatus: 'حالة الدفع',
    newStaff: 'موظف جديد',
    staffList: 'قائمة الموظفين',
    role: 'الدور',
    doctor: 'طبيب',
    dentist: 'طبيب أسنان',
    assistant: 'مساعد',
    receptionist: 'موظف استقبال',
    newInventoryItem: 'صنف مخزون جديد',
    itemName: 'اسم الصنف',
    itemNameArabic: 'اسم الصنف (بالعربية)',
    quantity: 'الكمية',
    unit: 'الوحدة',
    reorderLevel: 'مستوى إعادة الطلب',
    supplier: 'المورد',
    lastUpdated: 'آخر تحديث',
    updateQuantity: 'تحديث الكمية',
    accountingOverview: 'نظرة عامة على المحاسبة',
    totalIncome: 'إجمالي الدخل',
    totalExpenses: 'إجمالي المصروفات',
    netProfit: 'صافي الربح',
    thisYear: 'هذا العام',
    recentTransactions: 'المعاملات الأخيرة',
    type: 'النوع',
    income: 'دخل',
    expense: 'مصروف',
    category: 'الفئة',
    profileSettings: 'إعدادات الملف الشخصي',
    clinicSettings: 'إعدادات العيادة',
    changePassword: 'تغيير كلمة المرور',
    currentPassword: 'كلمة المرور الحالية',
    newPassword: 'كلمة المرور الجديدة',
    updateProfile: 'تحديث الملف الشخصي',
    updateSettings: 'تحديث الإعدادات',
    subscriptionInfo: 'معلومات الاشتراك',
    plan: 'الخطة',
    billingCycle: 'دورة الفوترة',
    nextBillingDate: 'تاريخ الفوترة التالي',
    manageBilling: 'إدارة الفوترة',
    areYouSure: 'هل أنت متأكد؟',
    deleteConfirmation: 'لا يمكن التراجع عن هذا الإجراء.',
    yesDelete: 'نعم، احذف',
    successMessage: 'تمت العملية بنجاح',
    errorMessage: 'حدث خطأ. يرجى المحاولة مرة أخرى.',
    requiredField: 'هذا الحقل مطلوب',
    invalidEmail: 'عنوان بريد إلكتروني غير صالح',
    passwordMismatch: 'كلمات المرور غير متطابقة',
    selectOption: 'اختر خياراً',
    bloodType: 'فصيلة الدم',
    allergies: 'الحساسية',
    checkup: 'فحص',
    consultation: 'استشارة',
    followUp: 'متابعة',
    emergency: 'طوارئ',
    confirmed: 'مؤكد',
    noShow: 'لم يحضر',
    viewAppointment: 'عرض الموعد',
    appointmentDetails: 'تفاصيل الموعد',
    appointmentStatus: 'حالة الموعد',
    markAsCompleted: 'وضع علامة كمكتمل',
    markAsCancelled: 'وضع علامة كملغى',
    prescriptions: 'الوصفات الطبية',
    treatmentPlan: 'خطة العلاج',
    price: 'السعر',
    priceArabic: 'السعر (بالعربية)',
    treatmentName: 'اسم العلاج',
    treatmentNameArabic: 'اسم العلاج (بالعربية)',
    itemDetails: 'تفاصيل الصنف',
    stockAlert: 'تنبيه المخزون',
    lowStock: 'مخزون منخفض',
    inStock: 'متوفر في المخزون',
    outOfStock: 'غير متوفر',
    addToInventory: 'إضافة للمخزون',
    removeFromInventory: 'إزالة من المخزون',
    financialReport: 'التقرير المالي',
    totalRevenue: 'إجمالي الإيرادات',
    profitMargin: 'هامش الربح',
    expenseReport: 'تقرير المصروفات',
    payNow: 'ادفع الآن',
    printInvoice: 'طباعة الفاتورة',
    downloadInvoice: 'تحميل الفاتورة',
    sendInvoice: 'إرسال الفاتورة',
    partiallyPaid: 'مدفوع جزئياً',
    overdue: 'متأخر',
    addStaffMember: 'إضافة موظف',
    editStaffMember: 'تعديل الموظف',
    staffDetails: 'تفاصيل الموظف',
    permissions: 'الصلاحيات',
    workSchedule: 'جدول العمل',
    emailNotifications: 'إشعارات البريد الإلكتروني',
    smsNotifications: 'الإشعارات النصية',
    systemSettings: 'إعدادات النظام',
    notificationSettings: 'إعدادات الإشعارات',
    securitySettings: 'إعدادات الأمان',
    clinicInformation: 'معلومات العيادة',
    workingHours: 'ساعات العمل',
    timezone: 'المنطقة الزمنية',
    currency: 'العملة',
    translations: 'الترجمات',
  },
  ckb: {
    appName: 'سیستەمی بەڕێوەبردنی کلینیک',
    login: 'چوونەژوورەوە',
    dentalClinicManager: 'بەڕێوەبەری کلینیکی ددان',
    signInToAccount: 'چوونەژوورەوە بۆ هەژمارەکەت',
    emailAddress: 'ناونیشانی ئیمەیڵ',
    emailPlaceholder: 'you@example.com',
    password: 'وشەی نهێنی',
    enter_your_password: 'وشەی نهێنی بنووسە',
    sign_in: 'چوونەژوورەوە',
    signing_in: 'چوونەژوورەوە...',
    loading: 'بارکردن...',
  },
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<'en' | 'ar' | 'ckb'>('en');
  const [isRTL, setIsRTL] = useState(false);
  const [dynamicTranslations, setDynamicTranslations] = useState<Record<string, Record<string, string>>>({});
  const [translationsLoaded, setTranslationsLoaded] = useState(false);
  const [availableLanguages, setAvailableLanguages] = useState<{ code: string; name: string; isRTL: boolean; isEnabled: boolean }[]>([]);

  useEffect(() => {
    // Clear any old translation cache - force fresh load
    const TRANSLATION_VERSION = '1.0.2'; // Increment this to force cache clear
    const cachedVersion = localStorage.getItem('clinic_translation_version');

    if (cachedVersion !== TRANSLATION_VERSION) {
      console.log('Translation version changed - clearing cache and reloading...');
      localStorage.setItem('clinic_translation_version', TRANSLATION_VERSION);
    }

    const savedLang = localStorage.getItem('clinic_language') as 'en' | 'ar' | 'ckb' | null;
    if (savedLang) {
      setLanguageState(savedLang);
      setIsRTL(savedLang === 'ar' || savedLang === 'ckb');
      document.documentElement.dir = (savedLang === 'ar' || savedLang === 'ckb') ? 'rtl' : 'ltr';
      document.documentElement.lang = savedLang;
    }
    loadLanguageSettings();
    loadDynamicTranslations();
  }, []);

  const loadLanguageSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('language_settings')
        .select('*')
        .order('language_code');

      if (error) throw error;

      setAvailableLanguages((data || []).map(lang => ({
        code: lang.language_code,
        name: lang.language_name,
        isRTL: lang.is_rtl,
        isEnabled: lang.is_enabled
      })));
    } catch (error) {
      console.error('Error loading language settings:', error);
      // Set default languages if database query fails
      setAvailableLanguages([
        { code: 'en', name: 'English', isRTL: false, isEnabled: true },
        { code: 'ar', name: 'العربية', isRTL: true, isEnabled: true },
        { code: 'ckb', name: 'کوردی', isRTL: true, isEnabled: true }
      ]);
    }
  };

  const loadDynamicTranslations = async () => {
    try {
      console.log('🔄 Loading translations from database (FRESH DATA)...');

      const timestamp = Date.now();

      // Fetch all data in batches to handle 1000 row limit
      const batchSize = 1000;
      let allKeys: any[] = [];
      let allTranslations: any[] = [];

      // Fetch keys in batches
      let keysOffset = 0;
      let hasMoreKeys = true;
      while (hasMoreKeys) {
        const keysRes = await supabase
          .from('translation_keys')
          .select('id, key_name')
          .range(keysOffset, keysOffset + batchSize - 1);

        if (keysRes.error) {
          console.error('❌ Error loading translation keys:', keysRes.error);
          break;
        }

        if (keysRes.data && keysRes.data.length > 0) {
          allKeys = [...allKeys, ...keysRes.data];
          keysOffset += batchSize;
          hasMoreKeys = keysRes.data.length === batchSize;
        } else {
          hasMoreKeys = false;
        }
      }

      // Fetch translations in batches
      let translationsOffset = 0;
      let hasMoreTranslations = true;
      while (hasMoreTranslations) {
        const translationsRes = await supabase
          .from('translations')
          .select('key_id, language_code, translated_text')
          .range(translationsOffset, translationsOffset + batchSize - 1);

        if (translationsRes.error) {
          console.error('❌ Error loading translations:', translationsRes.error);
          break;
        }

        if (translationsRes.data && translationsRes.data.length > 0) {
          allTranslations = [...allTranslations, ...translationsRes.data];
          translationsOffset += batchSize;
          hasMoreTranslations = translationsRes.data.length === batchSize;
        } else {
          hasMoreTranslations = false;
        }
      }

      console.log('📊 Raw query results:', {
        keysCount: allKeys.length,
        translationsCount: allTranslations.length,
        timestamp,
        sampleKeys: allKeys.slice(0, 10).map(k => ({ id: k.id, key_name: k.key_name })),
        treatmentKeys: allKeys.filter(k => ['filling', 'extraction', 'surgery', 'rootCanal', 'cleaning'].includes(k.key_name))
      });

      if (allKeys.length > 0 && allTranslations.length > 0) {
        const keyMap = new Map(allKeys.map(k => [k.id, k.key_name]));

        console.log('🗺️ KeyMap created:', {
          totalKeys: keyMap.size,
          hasFillingKey: allKeys.some(k => k.key_name === 'filling'),
          fillingKeyId: allKeys.find(k => k.key_name === 'filling')?.id,
          sampleKeyMapEntries: Array.from(keyMap.entries()).slice(0, 5)
        });

        const translationsMap: Record<string, Record<string, string>> = {
          en: {},
          ar: {},
          ckb: {}
        };

        allTranslations.forEach(t => {
          const keyName = keyMap.get(t.key_id);
          if (keyName && t.translated_text) {
            if (!translationsMap[t.language_code]) {
              translationsMap[t.language_code] = {};
            }
            translationsMap[t.language_code][keyName] = t.translated_text;
          }
        });

        console.log('🔍 Checking specific translations after mapping:', {
          fillingInArabic: translationsMap['ar']?.['filling'],
          extractionInArabic: translationsMap['ar']?.['extraction'],
          allCategoriesInArabic: translationsMap['ar']?.['allCategories']
        });

        console.log('✅ Translations loaded successfully:', {
          totalKeys: allKeys.length,
          totalTranslations: allTranslations.length,
          englishTranslations: allTranslations.filter(t => t.language_code === 'en').length,
          arabicTranslations: allTranslations.filter(t => t.language_code === 'ar').length,
          englishKeysLoaded: Object.keys(translationsMap['en'] || {}).length,
          arabicKeysLoaded: Object.keys(translationsMap['ar'] || {}).length,
          sampleEnglishKeys: Object.keys(translationsMap['en'] || {}).slice(0, 10),
          sampleArabicKeys: Object.keys(translationsMap['ar'] || {}).slice(0, 10),
          sampleArabicValues: Object.values(translationsMap['ar'] || {}).slice(0, 5)
        });

        // Test specific keys
        const testKeys = ['filling', 'extraction', 'surgery', 'rootCanal', 'cleaning', 'whitening', 'braces', 'implant', 'allCategories', 'search_treatment_types'];
        console.log('🔍 Testing treatment keys in Arabic:');
        testKeys.forEach(key => {
          console.log(`  ${key}: ${translationsMap['ar']?.[key] || '❌ MISSING'}`);
        });

        setDynamicTranslations(translationsMap);
        console.log('💾 Translations saved to state');
      } else {
        console.error('❌ No data returned from translation queries');
      }
    } catch (error) {
      console.error('❌ Error loading dynamic translations:', error);
    } finally {
      setTranslationsLoaded(true);
      console.log('✅ Translation loading complete');
    }
  };

  const setLanguage = (lang: 'en' | 'ar' | 'ckb') => {
    setLanguageState(lang);
    setIsRTL(lang === 'ar' || lang === 'ckb');
    localStorage.setItem('clinic_language', lang);
    document.documentElement.dir = (lang === 'ar' || lang === 'ckb') ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  };

  const t = (key: string): string => {
    // First check dynamic translations from database for current language
    const dynamicValue = dynamicTranslations[language]?.[key];
    if (dynamicValue) {
      return dynamicValue;
    }

    // Fallback to static translations for current language
    const staticTranslation = translations[language][key as keyof typeof translations['en']];
    if (staticTranslation) {
      return staticTranslation;
    }

    // For Kurdish, fallback to English if translation not found
    if (language === 'ckb') {
      const englishDynamic = dynamicTranslations['en']?.[key];
      if (englishDynamic) {
        return englishDynamic;
      }
      const englishStatic = translations['en'][key as keyof typeof translations['en']];
      if (englishStatic) {
        return englishStatic;
      }
    }

    // Log missing translations in development
    if (language === 'ar' || language === 'ckb') {
      console.warn(`⚠️ Missing ${language.toUpperCase()} translation for key: "${key}"`, {
        hasDynamicTranslations: !!dynamicTranslations[language],
        totalKeys: Object.keys(dynamicTranslations[language] || {}).length,
        translationsLoaded
      });
    }

    // Return key if no translation found
    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, isRTL, setLanguage, t, reloadTranslations: loadDynamicTranslations, availableLanguages }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
