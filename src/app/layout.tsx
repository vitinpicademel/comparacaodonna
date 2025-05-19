'use client';

import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, backgroundColor: '#1a1b2e', minHeight: '100vh' }}>
        <AppBar position="static" sx={{ bgcolor: '#23243a' }}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: '#fff' }}>
              Sistema de Planilhas
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                color="inherit"
                component={Link}
                href="/"
                sx={{
                  color: pathname === '/' ? '#5f5fff' : '#fff',
                  '&:hover': { color: '#5f5fff' },
                }}
              >
                Comparação
              </Button>
              <Button
                color="inherit"
                component={Link}
                href="/dashboard"
                sx={{
                  color: pathname === '/dashboard' ? '#5f5fff' : '#fff',
                  '&:hover': { color: '#5f5fff' },
                }}
              >
                Dashboard
              </Button>
            </Box>
          </Toolbar>
        </AppBar>
        {children}
      </body>
    </html>
  )
}
