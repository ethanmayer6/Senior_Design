import { useState } from "react";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import type { User } from "../types/user";

interface Props {
  user: User;
  onSave: (updated: Partial<User>) => void;
}

export default function UserForm({ user, onSave }: Props) {
  const [form, setForm] = useState<Partial<User>>(user);

  const updateField = (key: keyof User, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(form);
  };

  const fields: { key: keyof User; label: string; type?: string }[] = [
    { key: "firstName", label: "First Name" },
    { key: "lastName", label: "Last Name" },
    { key: "email", label: "Email", type: "email" },
    { key: "major", label: "Major" },
    { key: "phone", label: "Phone" },
  ];

  return (
    <div className="flex flex-col gap-4">
      {fields.map(({ key, label, type }) => (
        <div key={key} className="flex flex-col gap-1">
          <label
            htmlFor={key}
            className="text-sm font-medium text-gray-700"
          >
            {label}
          </label>
          <InputText
            id={key}
            type={type || "text"}
            value={(form[key] as string) || ""}
            onChange={(e) => updateField(key, e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400 transition-all duration-150"
          />
        </div>
      ))}

      <Button
        label="Save"
        onClick={handleSave}
        className="w-full bg-red-500 hover:bg-red-600 border-none py-3 text-white font-semibold rounded-md transition-all duration-200"
      />
    </div>
  );
}