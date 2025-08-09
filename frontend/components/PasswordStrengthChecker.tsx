'use client';

import { useState, useEffect } from 'react';

interface PasswordStrength {
  score: number;
  feedback: string[];
}

interface PasswordStrengthCheckerProps {
  password: string;
  onStrengthChange?: (strength: PasswordStrength) => void;
  className?: string;
}

export function usePasswordStrength(password: string): PasswordStrength {
  const [strength, setStrength] = useState<PasswordStrength>({ score: 0, feedback: [] });

  useEffect(() => {
    const checkPasswordStrength = (password: string): PasswordStrength => {
      const feedback: string[] = [];
      let score = 0;

      if (password.length >= 8) {
        score += 1;
      } else {
        feedback.push('At least 8 characters');
      }

      if (/[a-z]/.test(password)) {
        score += 1;
      } else {
        feedback.push('At least one lowercase letter');
      }

      if (/[A-Z]/.test(password)) {
        score += 1;
      } else {
        feedback.push('At least one uppercase letter');
      }

      if (/\d/.test(password)) {
        score += 1;
      } else {
        feedback.push('At least one number');
      }

      if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        score += 1;
      } else {
        feedback.push('At least one special character');
      }

      return { score, feedback };
    };

    const newStrength = checkPasswordStrength(password);
    setStrength(newStrength);
  }, [password]);

  return strength;
}

export default function PasswordStrengthChecker({ 
  password, 
  onStrengthChange, 
  className = '' 
}: PasswordStrengthCheckerProps) {
  const strength = usePasswordStrength(password);

  useEffect(() => {
    if (onStrengthChange) {
      onStrengthChange(strength);
    }
  }, [strength, onStrengthChange]);

  const getPasswordStrengthColor = () => {
    if (strength.score <= 1) return 'bg-red-400';
    if (strength.score <= 2) return 'bg-orange-400';
    if (strength.score <= 3) return 'bg-yellow-400';
    if (strength.score <= 4) return 'bg-green-400';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (strength.score <= 1) return 'Very Weak';
    if (strength.score <= 2) return 'Weak';
    if (strength.score <= 3) return 'Fair';
    if (strength.score <= 4) return 'Strong';
    return 'Very Strong';
  };

  if (!password) return null;

  return (
    <div className={`mt-2 ${className}`}>
      <div className="flex items-center space-x-2">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all ${getPasswordStrengthColor()}`}
            style={{ width: `${(strength.score / 5) * 100}%` }}
          ></div>
        </div>
        <span className="text-xs font-medium text-gray-600">
          {getPasswordStrengthText()}
        </span>
      </div>
      {strength.feedback.length > 0 && (
        <div className="mt-1 text-xs text-gray-600">
          <p>Requirements needed:</p>
          <ul className="list-disc list-inside ml-2">
            {strength.feedback.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
