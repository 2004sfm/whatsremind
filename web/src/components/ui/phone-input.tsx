import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  defaultCountry?: CountryCode
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
}

interface CountryInfo {
  code: CountryCode
  name: string
  callingCode: string
  flag: string
}

function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}

const regionNames = new Intl.DisplayNames(["es"], { type: "region" })

const PRIORITY_COUNTRIES: CountryCode[] = [
  "VE", // Venezuela
  "CO", // Colombia
  "MX", // México
  "AR", // Argentina
  "CL", // Chile
  "PE", // Perú
  "EC", // Ecuador
  "PA", // Panamá
  "DO", // Rep. Dominicana
  "ES", // España
  "US", // Estados Unidos
]

const ALL_COUNTRIES: CountryInfo[] = getCountries().map((code) => {
  let name: string = code
  try {
    name = regionNames.of(code) || code
  } catch {
    name = code
  }
  return {
    code,
    name,
    callingCode: getCountryCallingCode(code),
    flag: getFlagEmoji(code),
  }
})

const SORTED_COUNTRIES: CountryInfo[] = [
  ...PRIORITY_COUNTRIES.map((code) => ALL_COUNTRIES.find((c) => c.code === code)!).filter(Boolean),
  ...ALL_COUNTRIES.filter((c) => !PRIORITY_COUNTRIES.includes(c.code)).sort((a, b) =>
    a.name.localeCompare(b.name, "es")
  ),
]

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    {
      value = "",
      onChange,
      defaultCountry = "VE",
      placeholder = "412 123 4567",
      disabled = false,
      className,
      id,
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false)
    const [userCountry, setUserCountry] = React.useState<CountryCode | null>(null)

    // Detect country from value if present
    const parsedFromValue = React.useMemo(() => {
      if (!value) return null
      return parsePhoneNumberFromString(
        value.startsWith("+") ? value : `+${value}`
      )
    }, [value])

    // Active country is parsed country > user chosen country > defaultCountry
    const activeCountry: CountryCode =
      parsedFromValue?.country || userCountry || defaultCountry

    const callingCode = getCountryCallingCode(activeCountry)

    // Derive display national number without useEffect
    const displayNationalNumber = React.useMemo(() => {
      if (!value) return ""
      if (parsedFromValue) {
        return parsedFromValue.nationalNumber
      }
      let cleaned = value.replace(/\s+/g, "").replace(/-/g, "")
      if (cleaned.startsWith(`+${callingCode}`)) {
        return cleaned.substring(callingCode.length + 1)
      }
      if (cleaned.startsWith(callingCode)) {
        return cleaned.substring(callingCode.length)
      }
      return cleaned
    }, [value, parsedFromValue, callingCode])

    const currentCountryInfo = React.useMemo(() => {
      return (
        ALL_COUNTRIES.find((c) => c.code === activeCountry) ||
        ALL_COUNTRIES.find((c) => c.code === "VE")!
      )
    }, [activeCountry])

    const handleCountrySelect = (newCountry: CountryCode) => {
      setUserCountry(newCountry)
      setOpen(false)

      const newCallingCode = getCountryCallingCode(newCountry)
      const digits = displayNationalNumber.replace(/\D/g, "")
      if (digits) {
        onChange(`+${newCallingCode}${digits}`)
      }
    }

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputVal = e.target.value

      if (inputVal.startsWith("+")) {
        const parsed = parsePhoneNumberFromString(inputVal)
        if (parsed && parsed.country) {
          setUserCountry(parsed.country)
          onChange(parsed.format("E.164"))
          return
        }
      }

      const digits = inputVal.replace(/\D/g, "")
      if (!digits) {
        onChange("")
        return
      }

      onChange(`+${callingCode}${digits}`)
    }

    return (
      <div className={cn("flex items-center", className)}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={disabled}
              className="flex h-10 items-center justify-between gap-1.5 rounded-r-none border-r-0 px-2.5 font-normal hover:bg-accent focus:z-10 shrink-0"
              aria-label={`Seleccionar código de país. Actual: ${currentCountryInfo.name} (+${currentCountryInfo.callingCode})`}
            >
              <span className="text-base leading-none mr-1">{currentCountryInfo.flag}</span>
              <span className="text-xs font-medium text-muted-foreground">
                +{currentCountryInfo.callingCode}
              </span>
              <ChevronsUpDown className="h-3.5 w-3.5 opacity-50 shrink-0 ml-0.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar país o código..." className="h-9" />
              <CommandList className="max-h-60 overflow-y-auto">
                <CommandEmpty>No se encontró ningún país.</CommandEmpty>
                <CommandGroup heading="Países">
                  {SORTED_COUNTRIES.map((country) => (
                    <CommandItem
                      key={country.code}
                      value={`${country.name} +${country.callingCode} ${country.code}`}
                      onSelect={() => handleCountrySelect(country.code)}
                      className="flex items-center justify-between text-xs cursor-pointer py-1.5"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base leading-none">{country.flag}</span>
                        <span className="truncate">{country.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-muted-foreground font-mono">
                          +{country.callingCode}
                        </span>
                        <Check
                          className={cn(
                            "h-3.5 w-3.5 text-emerald-600",
                            activeCountry === country.code ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Input
          ref={ref}
          id={id}
          type="tel"
          disabled={disabled}
          value={displayNationalNumber}
          onChange={handleNumberChange}
          placeholder={placeholder}
          className="rounded-l-none focus-visible:z-10"
        />
      </div>
    )
  }
)

PhoneInput.displayName = "PhoneInput"
