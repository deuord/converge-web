import type { ChangeEvent } from 'react';
import styles from '../styles/app.module.css';

interface Props {
  models: string[];
  /** '' 表示用后端默认模型 */
  value: string;
  onChange: (model: string) => void;
}

export function ModelSelect({ models, value, onChange }: Props) {
  const onSelect = (e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value);
  return (
    <select className={styles.select} value={value} onChange={onSelect} title="模型">
      <option value="">默认模型</option>
      {models.map((m) => (
        <option key={m} value={m}>
          {m}
        </option>
      ))}
    </select>
  );
}
