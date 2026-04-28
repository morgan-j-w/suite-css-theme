"use client"

import { Button } from "@/components/ui/button"
import { CardTitle, CardDescription, CardHeader, CardContent, Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface PasswordModalProps {
  passwordInput: string
  passwordError: string
  onPasswordChange: (value: string) => void
  onErrorClear: () => void
  onSubmit: (e: React.FormEvent) => void
}

export const PasswordModal = ({
  passwordInput,
  passwordError,
  onPasswordChange,
  onErrorClear,
  onSubmit,
}: PasswordModalProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#21292C" }}>
      <div className="w-full max-w-md">
        <Card className="shadow-2xl">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <img 
                src="https://prod-swiftdigital-staticassets.s3-ap-southeast-2.amazonaws.com/sd_images/zzzz5705ed8cb762d381zzzz6836acb89a771304" 
                alt="Swift Digital Logo"
                className="h-10 w-auto"
              />
            </div>
            <CardTitle className="text-2xl">Brand Builder</CardTitle>
            <CardDescription>Enter password to access</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={passwordInput}
                  onChange={(e) => {
                    onPasswordChange(e.target.value)
                    onErrorClear()
                  }}
                  placeholder="Enter password"
                  className="mt-1"
                  autoFocus
                />
                {passwordError && (
                  <p className="text-red-500 text-sm mt-2">{passwordError}</p>
                )}
              </div>
              <Button type="submit" className="w-full">
                Access
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
