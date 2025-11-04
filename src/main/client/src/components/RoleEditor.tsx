import { useState } from "react";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import type { User } from "../types/user";

interface Props {
  user: User;
  onSave: (role: string) => void;
}

export default function RoleEditor({ user, onSave }: Props) {
  const [role, setRole] = useState<string>(user.role);
  const roles = ["USER", "ADMIN"];

  return (
    <div className="flex flex-col gap-3">
      <Dropdown
        value={role}
        options={roles.map((r) => ({ label: r, value: r }))}
        onChange={(e) => setRole(e.value)}
        className="w-full"
        placeholder="Select Role"
      />
      <Button label="Save Role" onClick={() => onSave(role)} />
    </div>
  );
}