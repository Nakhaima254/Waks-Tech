import { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface PasswordStrengthIndicatorProps {
  password: string;
}

const checks = [
  { label: '6+ characters', test: (p: string) => p.length >= 6 },
  { label: 'Uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Number', test: (p: string) => /\d/.test(p) },
  { label: 'Special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const strengthConfig = [
  { label: 'Very weak', color: 'bg-destructive' },
  { label: 'Weak', color: 'bg-destructive' },
  { label: 'Fair', color: 'bg-orange-500' },
  { label: 'Good', color: 'bg-yellow-500' },
  { label: 'Strong', color: 'bg-emerald-500' },
  { label: 'Very strong', color: 'bg-emerald-600' },
];

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const { score, passed } = useMemo(() => {
    const passed = checks.map((c) => c.test(password));
    return { score: passed.filter(Boolean).length, passed };
  }, [password]);

  if (!password) return null;

  const config = strengthConfig[score];
  const percent = (score / checks.length) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Password strength</span>
        <span className={cn('font-medium', score <= 1 ? 'text-destructive' : score <= 3 ? 'text-yellow-600' : 'text-emerald-600')}>
          {config.label}
        </span>
      </div>
      <Progress value={percent} className="h-1.5 [&>div]:transition-all [&>div]:duration-300" indicatorClassName={config.color} />
      <ul className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
        {checks.map((check, i) => (
          <li key={check.label} className={cn('flex items-center gap-1', passed[i] && 'text-emerald-600')}>
            <span>{passed[i] ? '✓' : '○'}</span>
            {check.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
