import { Autocomplete, TextField } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { GC_TIME, STALE_TIME } from "@/app/lib/consts";

const fetchUsers = async () => {
  const response = await fetch("/api/users");
  if (!response.ok) {
    throw new Error("Failed to fetch users");
  }
  const data = await response.json();
  return data.users.map((user: any) => ({
    value: user._id,
    label: `${user.name} - ${user.email}`,
  }));
};

const ChangeUser = ({
  isEditing,
  user,
  setUser,
}: {
  isEditing: boolean;
  user: string;
  setUser: (user: string) => void;
}) => {
  const { data: users, isLoading, isError, error } = useQuery<any[], Error>({
    queryKey: ["users"],
    queryFn: fetchUsers,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  const handleChange = (e: any, newValue: any) => {
    if (newValue !== null && newValue.value !== null) setUser(newValue.value);
  };

  return (
    <Autocomplete
      disablePortal
      autoComplete
      options={users || []}
      onChange={handleChange}
      value={users?.find((_user: any) => _user.value === user) || null}
      clearIcon={null}
      readOnly={!isEditing}
      loading={isLoading}
      renderInput={(params) => (
        <TextField
          {...params}
          label="User"
          error={isError}
          helperText={isError ? error.message : ""}
        />
      )}
    />
  );
};

export default ChangeUser;
