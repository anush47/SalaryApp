import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SnackbarProvider, useSnackbar, SnackbarConfig } from './SnackbarContext';

// Mock component to use the hook and trigger snackbar
const TestComponent = ({ snackbarConfig }: { snackbarConfig?: SnackbarConfig }) => {
  const { showSnackbar } = useSnackbar();
  return (
    <button onClick={() => showSnackbar(snackbarConfig || { message: 'Test Message' })}>
      Show Snackbar
    </button>
  );
};

describe('Snackbar System', () => {
  it('throws an error when useSnackbar is used outside of SnackbarProvider', () => {
    // Suppress console.error for this test as React will log an error boundary message
    const originalError = console.error;
    console.error = jest.fn();
    expect(() => render(<TestComponent />)).toThrow('useSnackbar must be used within a SnackbarProvider');
    console.error = originalError; // Restore original console.error
  });

  it('SnackbarProvider renders children', () => {
    render(
      <SnackbarProvider>
        <div>Child Component</div>
      </SnackbarProvider>
    );
    expect(screen.getByText('Child Component')).toBeInTheDocument();
  });

  it('shows a snackbar with the default options when showSnackbar is called with only a message', () => {
    render(
      <SnackbarProvider>
        <TestComponent snackbarConfig={{ message: 'Hello World' }} />
      </SnackbarProvider>
    );

    fireEvent.click(screen.getByText('Show Snackbar'));

    // Check for message
    expect(screen.getByText('Hello World')).toBeInTheDocument();
    // Check for default severity (info) - MUI Alert role="alert" and contains severity in class or style
    // For MUI v5, severity is often applied as a class like MuiAlert-standardInfo or MuiAlert-filledInfo
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('MuiAlert-standardInfo'); // Or other class based on MUI version and variant
  });

  it('shows a snackbar with custom severity, duration, and position', async () => {
    const customConfig: SnackbarConfig = {
      message: 'Error Occurred!',
      severity: 'error',
      duration: 3000,
      position: { vertical: 'top', horizontal: 'right' },
    };

    render(
      <SnackbarProvider>
        <TestComponent snackbarConfig={customConfig} />
      </SnackbarProvider>
    );

    fireEvent.click(screen.getByText('Show Snackbar'));

    expect(screen.getByText('Error Occurred!')).toBeInTheDocument();
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('MuiAlert-standardError'); // Check for error severity

    // Duration and position are harder to test directly with @testing-library/react as they affect timing and layout.
    // We assume MUI handles these correctly if props are passed.
    // For duration, you might need to use jest.useFakeTimers() and advance timers to check if it disappears.
  });

  it('snackbar closes when the close button is clicked', async () => {
    render(
      <SnackbarProvider>
        <TestComponent snackbarConfig={{ message: 'Closable Message' }} />
      </SnackbarProvider>
    );

    fireEvent.click(screen.getByText('Show Snackbar'));
    expect(screen.getByText('Closable Message')).toBeInTheDocument();

    // MUI Snackbar's close button usually has an ARIA label "Close" or similar
    // Or it might be an SVG icon. Let's assume it's a button with role 'button' inside the alert.
    const closeButton = screen.getByRole('button', { name: /close/i }); // Adjust selector as needed
    fireEvent.click(closeButton);

    // After clicking close, the message should disappear.
    // MUI might animate this, so we might need to wait.
    // Using queryByText which returns null if not found, and doesn't throw.
    await screen.findByText('Closable Message'); // Ensure it's there first
    fireEvent.click(closeButton);
    // It might take a moment for the snackbar to disappear due to animations
    // If it's animated, you might need to use waitForElementToBeRemoved or similar.
    // For simplicity, if it's immediately removed from DOM:
    expect(screen.queryByText('Closable Message')).not.toBeInTheDocument();
  });

  it('snackbar auto-hides after specified duration', () => {
    jest.useFakeTimers();
    render(
      <SnackbarProvider>
        <TestComponent snackbarConfig={{ message: 'Auto-hide message', duration: 100 }} />
      </SnackbarProvider>
    );

    fireEvent.click(screen.getByText('Show Snackbar'));
    expect(screen.getByText('Auto-hide message')).toBeInTheDocument();

    // Fast-forward time
    jest.advanceTimersByTime(100);

    expect(screen.queryByText('Auto-hide message')).not.toBeInTheDocument();
    jest.useRealTimers();
  });

});

// Ensure jest and @testing-library/jest-dom are set up in the project.
// The specific class names for severity (e.g., MuiAlert-standardInfo) might vary
// depending on the exact MUI version and the variant of the Alert component used (standard, filled, outlined).
// Adjust assertions for severity classes if needed.
