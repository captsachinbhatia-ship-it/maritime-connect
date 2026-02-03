import { UnassignedContactsList } from '@/components/dashboard/UnassignedContactsList';

export default function UnassignedContacts() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Unassigned Contacts</h1>
        <p className="mt-1 text-muted-foreground">
          Manage and assign contacts that are not yet assigned to any team member
        </p>
      </div>

      {/* Unassigned Contacts List */}
      <UnassignedContactsList />
    </div>
  );
}
