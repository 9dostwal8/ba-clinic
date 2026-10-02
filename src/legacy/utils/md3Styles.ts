// @ts-nocheck
export const md3 = {
  surfaces: {
    surface: 'bg-neutral-50',
    surfaceContainerLowest: 'bg-white',
    surfaceContainerLow: 'bg-neutral-50',
    surfaceContainer: 'bg-neutral-100',
    surfaceContainerHigh: 'bg-neutral-200',
    surfaceContainerHighest: 'bg-neutral-300',
    surfaceDim: 'bg-neutral-200',
    surfaceBright: 'bg-neutral-50',
    surfaceVariant: 'bg-neutral-200',
  },

  colors: {
    primary: 'bg-blue-600',
    onPrimary: 'text-white',
    primaryContainer: 'bg-blue-100',
    onPrimaryContainer: 'text-blue-900',

    secondary: 'bg-teal-600',
    onSecondary: 'text-white',
    secondaryContainer: 'bg-teal-100',
    onSecondaryContainer: 'text-teal-900',

    tertiary: 'bg-amber-600',
    onTertiary: 'text-white',
    tertiaryContainer: 'bg-amber-100',
    onTertiaryContainer: 'text-amber-900',

    error: 'bg-red-600',
    onError: 'text-white',
    errorContainer: 'bg-red-100',
    onErrorContainer: 'text-red-900',

    surface: 'bg-neutral-50',
    onSurface: 'text-neutral-900',
    onSurfaceVariant: 'text-neutral-700',
    outline: 'border-neutral-400',
    outlineVariant: 'border-neutral-200',
  },

  elevation: {
    level0: '',
    level1: 'shadow-sm',
    level2: 'shadow-md',
    level3: 'shadow-lg',
    level4: 'shadow-xl',
    level5: 'shadow-2xl',
  },

  shapes: {
    none: 'rounded-none',
    extraSmall: 'rounded',
    small: 'rounded-lg',
    medium: 'rounded-xl',
    large: 'rounded-2xl',
    extraLarge: 'rounded-3xl',
    full: 'rounded-full',
  },

  states: {
    hover: 'hover:bg-black/5',
    focus: 'focus:bg-black/10 focus:outline-none focus:ring-2 focus:ring-blue-500/50',
    pressed: 'active:bg-black/10',
    dragged: 'cursor-move opacity-90',
    disabled: 'opacity-38 cursor-not-allowed',
  },

  components: {
    filledButton: 'px-6 py-3 bg-blue-600 text-white rounded-full font-medium hover:shadow-md hover:bg-blue-700 active:bg-blue-800 transition-all duration-200',
    outlinedButton: 'px-6 py-3 border border-neutral-400 text-blue-600 rounded-full font-medium hover:bg-blue-50 active:bg-blue-100 transition-all duration-200',
    textButton: 'px-6 py-3 text-blue-600 rounded-full font-medium hover:bg-blue-50 active:bg-blue-100 transition-all duration-200',
    tonalButton: 'px-6 py-3 bg-blue-100 text-blue-900 rounded-full font-medium hover:shadow-sm hover:bg-blue-200 active:bg-blue-300 transition-all duration-200',

    elevatedButton: 'px-6 py-3 bg-neutral-50 text-blue-600 rounded-full font-medium shadow-md hover:shadow-lg active:shadow-sm transition-all duration-200',

    filledCard: 'bg-neutral-100 rounded-xl p-4 shadow-sm',
    elevatedCard: 'bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow duration-200',
    outlinedCard: 'bg-white rounded-xl p-4 border border-neutral-200',

    fab: 'w-14 h-14 bg-blue-600 text-white rounded-2xl shadow-lg hover:shadow-xl active:shadow-md transition-all duration-200 flex items-center justify-center',
    fabSmall: 'w-10 h-10 bg-blue-600 text-white rounded-xl shadow-md hover:shadow-lg active:shadow-sm transition-all duration-200 flex items-center justify-center',
    fabLarge: 'w-24 h-24 bg-blue-600 text-white rounded-3xl shadow-xl hover:shadow-2xl active:shadow-lg transition-all duration-200 flex items-center justify-center',

    chip: 'px-4 py-2 bg-neutral-100 text-neutral-900 rounded-lg border border-neutral-200 hover:bg-neutral-200 transition-colors duration-200',
    chipSelected: 'px-4 py-2 bg-blue-100 text-blue-900 rounded-lg border border-blue-200 hover:bg-blue-200 transition-colors duration-200',

    navigationDrawer: 'bg-neutral-50 rounded-r-2xl',
    navigationRail: 'bg-neutral-50 rounded-2xl',

    dialog: 'bg-neutral-50 rounded-3xl p-6 shadow-2xl',

    textField: 'w-full px-4 py-3 bg-neutral-100 border border-neutral-400 rounded-lg focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-200',
    textFieldFilled: 'w-full px-4 py-3 bg-neutral-100 rounded-t-lg border-b-2 border-neutral-400 focus:border-blue-600 outline-none transition-all duration-200',

    listItem: 'px-4 py-3 rounded-lg hover:bg-neutral-100 active:bg-neutral-200 transition-colors duration-150',
    listItemSelected: 'px-4 py-3 rounded-lg bg-blue-100 text-blue-900',

    navigationBar: 'bg-neutral-50 border-t border-neutral-200',
    navigationBarItem: 'flex flex-col items-center justify-center px-3 py-2 rounded-lg hover:bg-neutral-100 active:bg-neutral-200 transition-colors duration-150',
    navigationBarItemSelected: 'flex flex-col items-center justify-center px-3 py-2 rounded-lg bg-blue-100 text-blue-900',

    topAppBar: 'bg-neutral-50 border-b border-neutral-200',

    snackbar: 'bg-neutral-800 text-white rounded-lg px-4 py-3 shadow-lg',
  },

  typography: {
    displayLarge: 'text-6xl font-normal',
    displayMedium: 'text-5xl font-normal',
    displaySmall: 'text-4xl font-normal',

    headlineLarge: 'text-3xl font-normal',
    headlineMedium: 'text-2xl font-normal',
    headlineSmall: 'text-xl font-normal',

    titleLarge: 'text-lg font-medium',
    titleMedium: 'text-base font-medium',
    titleSmall: 'text-sm font-medium',

    bodyLarge: 'text-base font-normal',
    bodyMedium: 'text-sm font-normal',
    bodySmall: 'text-xs font-normal',

    labelLarge: 'text-sm font-medium',
    labelMedium: 'text-xs font-medium',
    labelSmall: 'text-[11px] font-medium',
  },
};

export const md3Module = (color: string) => {
  const colorMap: Record<string, {
    container: string;
    onContainer: string;
    hover: string;
    active: string;
  }> = {
    blue: {
      container: 'bg-blue-100',
      onContainer: 'text-blue-900',
      hover: 'hover:bg-blue-200',
      active: 'bg-blue-200',
    },
    teal: {
      container: 'bg-teal-100',
      onContainer: 'text-teal-900',
      hover: 'hover:bg-teal-200',
      active: 'bg-teal-200',
    },
    emerald: {
      container: 'bg-emerald-100',
      onContainer: 'text-emerald-900',
      hover: 'hover:bg-emerald-200',
      active: 'bg-emerald-200',
    },
    amber: {
      container: 'bg-amber-100',
      onContainer: 'text-amber-900',
      hover: 'hover:bg-amber-200',
      active: 'bg-amber-200',
    },
    rose: {
      container: 'bg-rose-100',
      onContainer: 'text-rose-900',
      hover: 'hover:bg-rose-200',
      active: 'bg-rose-200',
    },
    sky: {
      container: 'bg-sky-100',
      onContainer: 'text-sky-900',
      hover: 'hover:bg-sky-200',
      active: 'bg-sky-200',
    },
    green: {
      container: 'bg-green-100',
      onContainer: 'text-green-900',
      hover: 'hover:bg-green-200',
      active: 'bg-green-200',
    },
    cyan: {
      container: 'bg-cyan-100',
      onContainer: 'text-cyan-900',
      hover: 'hover:bg-cyan-200',
      active: 'bg-cyan-200',
    },
    red: {
      container: 'bg-red-100',
      onContainer: 'text-red-900',
      hover: 'hover:bg-red-200',
      active: 'bg-red-200',
    },
    gray: {
      container: 'bg-gray-100',
      onContainer: 'text-gray-900',
      hover: 'hover:bg-gray-200',
      active: 'bg-gray-200',
    },
  };

  return colorMap[color] || colorMap.blue;
};
