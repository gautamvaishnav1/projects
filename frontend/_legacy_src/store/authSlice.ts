import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  provider: 'email' | 'github' | 'google';
}

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  authMode: 'login' | 'signup';
  step: 'form' | 'otp';
  emailInput: string;
  passwordInput: string;
  nameInput: string;
  otpCode: string[];
  otpTimeRemaining: number;
  isSubmitting: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: {
    id: 'usr_gautam_0305',
    name: 'gautamvaishnav0305',
    email: 'gautamvaishnav0305@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    provider: 'github'
  },
  isAuthenticated: true,
  authMode: 'login',
  step: 'form',
  emailInput: 'gautamvaishnav0305@gmail.com',
  passwordInput: '',
  nameInput: 'gautamvaishnav0305',
  otpCode: ['', '', '', '', '', ''],
  otpTimeRemaining: 60,
  isSubmitting: false,
  error: null,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthMode: (state, action: PayloadAction<'login' | 'signup'>) => {
      state.authMode = action.payload;
      state.step = 'form';
      state.error = null;
    },
    setEmailInput: (state, action: PayloadAction<string>) => {
      state.emailInput = action.payload;
    },
    setPasswordInput: (state, action: PayloadAction<string>) => {
      state.passwordInput = action.payload;
    },
    setNameInput: (state, action: PayloadAction<string>) => {
      state.nameInput = action.payload;
    },
    setOtpDigit: (state, action: PayloadAction<{ index: number; digit: string }>) => {
      const { index, digit } = action.payload;
      if (index >= 0 && index < 6) {
        state.otpCode[index] = digit;
      }
    },
    resetOtp: (state) => {
      state.otpCode = ['', '', '', '', '', ''];
    },
    requestOtpSend: (state) => {
      if (!state.emailInput || !state.emailInput.includes('@')) {
        state.error = 'Please enter a valid email address.';
        return;
      }
      state.isSubmitting = true;
      state.error = null;
    },
    otpSendSuccess: (state) => {
      state.isSubmitting = false;
      state.step = 'otp';
      state.otpTimeRemaining = 60;
    },
    decrementOtpTimer: (state) => {
      if (state.otpTimeRemaining > 0) {
        state.otpTimeRemaining -= 1;
      }
    },
    loginSuccess: (state, action: PayloadAction<UserProfile>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.isSubmitting = false;
      state.step = 'form';
      state.error = null;
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isSubmitting = false;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.step = 'form';
      state.emailInput = '';
      state.passwordInput = '';
      state.nameInput = '';
      state.otpCode = ['', '', '', '', '', ''];
    },
    clearError: (state) => {
      state.error = null;
    }
  }
});

export const {
  setAuthMode,
  setEmailInput,
  setPasswordInput,
  setNameInput,
  setOtpDigit,
  resetOtp,
  requestOtpSend,
  otpSendSuccess,
  decrementOtpTimer,
  loginSuccess,
  loginFailure,
  logout,
  clearError
} = authSlice.actions;

export default authSlice.reducer;
