"use client";

import { useState, useRef, useCallback } from "react";
import type { Service } from "@/types";

export type BookingStep = "service" | "staff" | "date" | "time" | "contact" | "success";

export interface ContactInfo {
  name: string;
  phone: string;
  email: string;
}

export interface BookingState {
  step: BookingStep;
  service: Service | null;
  staffId: string | null;
  date: string | null;
  time: string | null;
  contact: ContactInfo;
  submitting: boolean;
  error: string;
}

const EMPTY_CONTACT: ContactInfo = { name: "", phone: "", email: "" };

export function useBookingFlow(initialService?: Service | null, staffChoice = false) {
  const [state, setState] = useState<BookingState>({
    step: initialService ? (staffChoice ? "staff" : "date") : "service",
    service: initialService ?? null,
    staffId: null,
    date: null,
    time: null,
    contact: EMPTY_CONTACT,
    submitting: false,
    error: "",
  });

  // Always-current ref so async callbacks avoid stale closure.
  const stateRef = useRef(state);
  // eslint-disable-next-line react-hooks/refs
  stateRef.current = state;

  const setService = useCallback((service: Service) => {
    setState(s => ({ ...s, service, step: staffChoice ? "staff" : "date", staffId: null, date: null, time: null }));
  }, [staffChoice]);

  const setStaff = useCallback((staffId: string | null) => {
    setState(s => ({ ...s, staffId, step: "date", date: null, time: null }));
  }, []);

  const setDate = useCallback((date: string) => {
    setState(s => ({ ...s, date, step: "time", time: null }));
  }, []);

  const setTime = useCallback((time: string) => {
    setState(s => ({ ...s, time, step: "contact" }));
  }, []);

  const setContact = useCallback((patch: Partial<ContactInfo>) => {
    setState(s => ({ ...s, contact: { ...s.contact, ...patch } }));
  }, []);

  const goBack = useCallback(() => {
    setState(s => {
      if (s.step === "contact") return { ...s, step: "time" };
      if (s.step === "time")    return { ...s, step: "date", time: null };
      if (s.step === "date")    return { ...s, step: staffChoice ? "staff" : "service", date: null };
      if (s.step === "staff")   return { ...s, step: "service", staffId: null };
      return s;
    });
  }, [staffChoice]);

  const submit = useCallback(async (businessId: string, businessName: string, lang?: string) => {
    const s = stateRef.current;
    if (!s.service || !s.date || !s.time || !s.contact.name || !s.contact.phone) return;

    setState(prev => ({ ...prev, submitting: true, error: "" }));
    try {
      const res = await fetch("/api/public/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          businessName,
          serviceId: s.service!.id,
          serviceName: s.service!.name,
          serviceDuration: s.service!.duration,
          servicePrice: s.service!.price,
          date: s.date,
          time: s.time,
          staffId: s.staffId,
          customerName: s.contact.name,
          customerPhone: s.contact.phone,
          customerEmail: s.contact.email || null,
          lang: lang || "en",
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setState(prev => ({ ...prev, submitting: false, error: data.error || "Something went wrong. Please try again." }));
      } else {
        setState(prev => ({ ...prev, submitting: false, step: "success" }));
      }
    } catch {
      setState(prev => ({ ...prev, submitting: false, error: "Network error. Please try again." }));
    }
  }, []);

  return { state, setService, setStaff, setDate, setTime, setContact, goBack, submit };
}
