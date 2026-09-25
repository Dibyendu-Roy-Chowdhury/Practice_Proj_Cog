/**
 * Global toast / notification utility.
 * Wraps antd's notification API so all workbench actions produce consistent feedback.
 */
import { notification } from 'antd';

notification.config({ placement: 'bottomRight', duration: 4 });

const ICONS = {
  success: { color: '#10B981' },
  error:   { color: '#EF4444' },
  warning: { color: '#F59E0B' },
  info:    { color: '#0BA5EC' },
};

function show(type, message, description) {
  notification[type]({ message, description, style: { borderLeft: `3px solid ${ICONS[type].color}` } });
}

export const toast = {
  success: (msg, desc) => show('success', msg, desc),
  error:   (msg, desc) => show('error',   msg, desc),
  warning: (msg, desc) => show('warning', msg, desc),
  info:    (msg, desc) => show('info',    msg, desc),

  /** Workbench-specific convenience helpers */
  runbookStarted:   (name)  => show('info',    'Recovery Protocol Initiated',  `Runbook "${name}" is now executing.`),
  runbookSuccess:   (name)  => show('success', 'Runbook Completed',            `"${name}" resolved successfully.`),
  runbookFailed:    (name)  => show('error',   'Runbook Failed',               `"${name}" encountered an error. Review the terminal log.`),
  incidentResolved: (agent) => show('success', 'Incident Resolved',            `${agent} has been marked as resolved.`),
  overrideApplied:  (agent) => show('success', 'Override Applied',             `Routing policy updated for ${agent}.`),
  hitlDecision:     (d, a)  => show(d === 'Approved' ? 'success' : 'warning', `HITL ${d}`, `Action for ${a} has been ${d.toLowerCase()}.`),
  fleetReboot:      (env)   => show('info',    'Fleet Reboot Initiated',       `${env} agents are draining and restarting.`),
};
