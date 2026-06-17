"use client";

import { useState, useRef, useCallback } from "react";
import type { Service } from "@/types";

export type BookingStep = "service" | "date" | "time" | "contact" | "success";

export interface ContactInfo {
  name: string;
  phone: string;
  email: string;
}

export interface BookingState {
  step: BookingStep;
  service: Service | null;
  date: string | null;
  time: string | null;
  contact: ContactInfo;
  submitting: boolean;
  error: string;
}

const EMPTY_CONTACT: ContactInfo = { name: "", phone: "", email: "" };

export function useBookingFlow(initialService?: Service | null) {
  const [state, setState] = useState<BookingState>({
    step: initialService ? "date" : "service",
    service: initialService ?? null,
    date: null,
    time: null,
    contact: EMPTY_CONTACT,
    submitting: false,
    error: "",
  });

  // Always-current ref so async callbacks avoid stale closure
  const stateRef = useRef(state);
  stateRef.current = state;

  const setService = useCallback((service: Service) => {
    setState(s => ({ ...s, service, step: "date", date: null, time: null }));
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
      if (s.step === "date")    return { ...s, step: "service", date: null };
      return s;
    });
  }, []);

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

  return { state, setService, setDate, setTime, setContact, goBack, submit };
}
