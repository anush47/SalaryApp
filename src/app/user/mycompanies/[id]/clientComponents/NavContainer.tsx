'use client';
import CompanySideBar from './companySideBar';
import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import CompanyMainBox from './companyMainBox';
import { useSearchParams } from 'next/navigation';

export type Selected =
  | 'quick'
  | 'details'
  | 'employees'
  | 'payments'
  | 'salaries'
  | 'purchases'
  | 'documents';

const NavContainer = ({
  user,
  companyId,
}: {
  user: {
    name: string;
    email: string;
    id: string;
    role: string;
    image: string;
  };
  companyId: string;
}) => {
  const [selected, setSelected] = useState<Selected>('quick');
  const searchParams = useSearchParams();

  useEffect(() => {
    const selectedParam = searchParams?.get('companyPageSelect');
    if (
      selectedParam &&
      [
        'quick',
        'details',
        'employees',
        'payments',
        'salaries',
        'purchases',
        'documents',
      ].includes(selectedParam)
    ) {
      setSelected(selectedParam as Selected);
    } else {
      setSelected('quick');
    }
  }, [searchParams]);

  return (
    <Box sx={{ display: 'flex' }}>
      <CompanySideBar
        selected={selected}
        setSelected={setSelected}
        companyId={companyId}
        user={user}
      />
      <CompanyMainBox
        selected={selected}
        companyId={companyId}
        user={user}
      />
    </Box>
  );
};

export default NavContainer;
