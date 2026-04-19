import Loader from '@/components/ui/loader-11';

export default function Loading() {
  return (
    <div className="w-full flex-grow min-h-screen flex flex-col items-center justify-center bg-[#09090b]">
      <Loader />
      <p className="text-white/50 animate-pulse mt-8 font-mono text-sm tracking-widest uppercase">
        Chargement du Projet...
      </p>
    </div>
  );
}
