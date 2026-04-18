import UsernameForm from "./UsernameForm";

export default function UsernamePage() {
  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">Choose a username</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        This is how people will find you.
      </p>
      <UsernameForm />
    </div>
  );
}
