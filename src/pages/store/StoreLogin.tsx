import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { listStoresForLogin, loginStore } from '../../services/authService';
import { useAuth } from '../../stores/authStore';
import { toast } from '../../stores/toastStore';

export function StoreLogin() {
  const navigate = useNavigate();
  const setStore = useAuth((s) => s.setStore);
  const { data: stores = [], isLoading } = useQuery({
    queryKey: ['storesForLogin'],
    queryFn: listStoresForLogin,
  });
  const [storeId, setStoreId] = useState('');
  const [passcode, setPasscode] = useState('');

  useEffect(() => {
    if (!storeId && stores.length > 0) setStoreId(stores[0].id);
  }, [stores, storeId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const store = await loginStore(storeId, passcode);
      if (!store) {
        toast.error('Invalid passcode.');
        return;
      }
      setStore(store.id);
      navigate('/store/scan');
    } catch (err) {
      toast.error(`Sign-in failed: ${(err as Error).message}`);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col p-6">
      <Link to="/" className="inline-flex items-center gap-1 text-plum/60 text-sm">
        <ArrowLeft size={16} /> Back
      </Link>
      <div className="flex-1 flex items-center justify-center">
        <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
          <div>
            <div className="font-display text-2xl text-plum">Store Login</div>
            <div className="text-plum/60 text-sm">Sign in to start issuing raffle entries.</div>
          </div>
          <div>
            <label className="label">Store</label>
            <select className="input" value={storeId} onChange={(e) => setStoreId(e.target.value)} disabled={isLoading}>
              {isLoading ? <option>Loading…</option> : stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — Booth {s.boothNumber}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Passcode</label>
            <input
              type="password"
              className="input"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter passcode"
            />
          </div>
          <button className="btn-primary w-full" type="submit" disabled={!storeId}>Sign in</button>
        </form>
      </div>
    </div>
  );
}
