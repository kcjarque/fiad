import { useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getGuestByQr } from '../../services/guestService';
import { useAuth } from '../../stores/authStore';
import { useEventStore } from '../../stores/eventStore';
import { toast } from '../../stores/toastStore';

export function QrSignIn() {
  const { token } = useParams<{ token: string }>();
  const setGuest = useAuth((s) => s.setGuest);
  const setSelectedEvent = useEventStore((s) => s.setSelectedEvent);

  const { data: guest, isLoading, isError } = useQuery({
    queryKey: ['guest', 'byQr', token],
    queryFn: () => (token ? getGuestByQr(token) : Promise.resolve(undefined)),
    enabled: !!token,
    retry: false,
  });

  useEffect(() => {
    if (guest) {
      setGuest(guest.id);
      setSelectedEvent(guest.eventId);
      toast.success(`Welcome, ${guest.name.split(' ')[0]}!`);
    }
  }, [guest, setGuest, setSelectedEvent]);

  if (!token) return <Navigate to="/" replace />;
  if (isLoading) {
    return (
      <div className="min-h-[100svh] bg-cream flex items-center justify-center p-6 text-plum/60">
        Signing you in…
      </div>
    );
  }
  if (isError || !guest) {
    return (
      <div className="min-h-[100svh] bg-cream flex flex-col items-center justify-center p-6 text-center">
        <div className="font-display text-2xl text-plum">Sign-in link invalid</div>
        <p className="text-plum/60 mt-2 text-sm max-w-sm">
          This link is expired or unknown. Try registering again, or sign in with your email.
        </p>
        <a href="/app/login" className="btn-primary mt-6">Sign in with email</a>
      </div>
    );
  }
  return <Navigate to="/app/ticket" replace />;
}
