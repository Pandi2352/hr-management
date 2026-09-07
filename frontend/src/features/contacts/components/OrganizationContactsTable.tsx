import React from 'react';
import { Building, MapPin, Mail, Phone, Globe, ExternalLink } from 'lucide-react';
import type { OrganizationOfficeContact } from '../types/contacts.types';

interface OrganizationContactsTableProps {
  offices: OrganizationOfficeContact[];
}

export const OrganizationContactsTable: React.FC<OrganizationContactsTableProps> = ({
  offices,
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs border-b border-slate-200 dark:border-slate-800">
          <tr>
            <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">
              Office / Entity
            </th>
            <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">
              Department / Focus
            </th>
            <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">
              Location
            </th>
            <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">
              Official Email
            </th>
            <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">
              Office Phone
            </th>
            <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">
              Website
            </th>
            <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">
              Physical Address
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          {offices.map((office) => (
            <tr
              key={office.id}
              className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
            >
              {/* Entity Name */}
              <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-violet-600 shrink-0" />
                  <span className="font-bold">{office.name}</span>
                  {office.isHeadquarters && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 border border-violet-200">
                      HQ
                    </span>
                  )}
                </div>
              </td>

              {/* Department */}
              <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                {office.department || 'Corporate General'}
              </td>

              {/* Location */}
              <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>{office.location}</span>
                </div>
              </td>

              {/* Email */}
              <td className="py-3.5 px-4">
                <a
                  href={`mailto:${office.email}`}
                  className="text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1.5"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span>{office.email}</span>
                </a>
              </td>

              {/* Phone */}
              <td className="py-3.5 px-4">
                <a
                  href={`tel:${office.phone}`}
                  className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span>{office.phone}</span>
                </a>
              </td>

              {/* Website */}
              <td className="py-3.5 px-4">
                <a
                  href={office.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-700 dark:text-slate-300 hover:text-violet-600 flex items-center gap-1 truncate max-w-[150px]"
                >
                  <Globe className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{office.website.replace('https://', '')}</span>
                  <ExternalLink className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                </a>
              </td>

              {/* Address */}
              <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 max-w-[260px] truncate" title={office.address}>
                {office.address}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
