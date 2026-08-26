/**
 * Grades & Semester Calculator View (Spreadsheet)
 * Features:
 * - 5 Teaching Blocks (Maths, Physique, Info, Soft Skills, Projets)
 * - Coefficients per evaluation & per block
 * - Dropdown for +0, +1, +2 Bonus points per subject
 * - Semester validation rule: ALL blocks must have an average >= 10.00/20
 * - Dynamic color coding on block & global averages
 * - Add/delete evaluations per block
 */

import { store } from '../store.js';
import { Modal } from '../components/modal.js';
import { Toast } from '../components/toast.js';

export const GradesView = {
  render(container) {
    const gradesData = store.getGradesData();
    const blocks = gradesData.blocks || [];

    // Compute metrics for each block and the whole semester
    let totalWeightedSum = 0;
    let totalBlockCoefs = 0;
    let allBlocksValidated = true;
    let failedBlocksCount = 0;

    const computedBlocks = blocks.map(block => {
      let blockSum = 0;
      let blockCoefSum = 0;

      const subjectsWithFinal = (block.subjects || []).map(sub => {
        const rawGrade = (sub.grade !== null && sub.grade !== undefined && !isNaN(sub.grade)) ? Number(sub.grade) : null;
        const bonus = Number(sub.bonus || 0);
        const effectiveGrade = rawGrade !== null ? Math.min(20, rawGrade + bonus) : null;

        if (effectiveGrade !== null) {
          blockSum += effectiveGrade * (sub.coef || 1);
          blockCoefSum += (sub.coef || 1);
        }

        return { ...sub, rawGrade, bonus, effectiveGrade };
      });

      const blockAverage = blockCoefSum > 0 ? (blockSum / blockCoefSum) : null;
      const isValidated = blockAverage !== null && blockAverage >= 10.0;

      if (blockAverage !== null) {
        if (!isValidated) {
          allBlocksValidated = false;
          failedBlocksCount++;
        }
        totalWeightedSum += blockAverage * (block.coef || 1);
        totalBlockCoefs += (block.coef || 1);
      }

      return {
        ...block,
        subjects: subjectsWithFinal,
        blockAverage,
        isValidated
      };
    });

    const semesterAverage = totalBlockCoefs > 0 ? (totalWeightedSum / totalBlockCoefs) : null;

    container.innerHTML = `
      <div class="space-y-6">
        
        <!-- Header & Global Semester Summary Banner -->
        <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          <div class="flex items-center gap-3">
            <div class="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-900/60">
              <i data-lucide="calculator" class="w-6 h-6"></i>
            </div>
            <div>
              <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">Tableur de Notes & Validation du Semestre</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">Règle d'école : validation si la moyenne de chaque bloc est ≥ 10.00/20</p>
            </div>
          </div>

          <!-- Global Verdict Pill -->
          <div class="flex items-center gap-3 flex-wrap">
            
            <div class="p-3 px-4 rounded-2xl border flex items-center gap-3 ${semesterAverage !== null && allBlocksValidated ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100' : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100'}">
              <div>
                <div class="text-[11px] uppercase tracking-wider font-bold opacity-75">Moyenne Générale</div>
                <div class="text-xl font-black">${semesterAverage !== null ? semesterAverage.toFixed(2) : '--'} <span class="text-xs font-normal">/ 20</span></div>
              </div>
              <div class="h-8 w-px bg-current opacity-20 mx-1"></div>
              <div class="text-xs font-bold flex items-center gap-1.5">
                ${allBlocksValidated && semesterAverage !== null ? `
                  <i data-lucide="check-check" class="w-5 h-5 text-emerald-600 dark:text-emerald-400"></i>
                  <span>SEMESTRE VALIDÉ 🎉</span>
                ` : `
                  <i data-lucide="alert-triangle" class="w-5 h-5 text-rose-600 dark:text-rose-400"></i>
                  <span>${failedBlocksCount} BLOC(S) EN DANGER ⚠️</span>
                `}
              </div>
            </div>

          </div>

        </div>

        <!-- Blocks Spreadsheet -->
        <div class="space-y-6">
          ${computedBlocks.map(block => {
            const avgClass = this._getAverageBadgeClass(block.blockAverage);
            return `
              <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden" data-block-id="${block.id}">
                
                <!-- Block Header -->
                <div class="px-5 py-3.5 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                  <div class="flex items-center gap-2.5">
                    <span class="w-3 h-3 rounded-full ${block.isValidated ? 'bg-emerald-500' : 'bg-rose-500'}"></span>
                    <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100">${block.name}</h3>
                    <span class="text-xs text-slate-400 font-mono">Coef. ${block.coef || 1}</span>
                  </div>

                  <div class="flex items-center gap-3">
                    <div class="text-xs font-bold px-3 py-1 rounded-xl border ${avgClass}">
                      Moyenne bloc : ${block.blockAverage !== null ? block.blockAverage.toFixed(2) : '--'} / 20
                      ${block.isValidated ? '✓ Validé' : '✗ Non validé'}
                    </div>

                    <button data-add-eval="${block.id}" class="text-xs font-semibold px-2.5 py-1 rounded-lg bg-brand-50 hover:bg-brand-100 dark:bg-brand-950 dark:hover:bg-brand-900 text-brand-700 dark:text-brand-300 transition-colors flex items-center gap-1">
                      <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                      <span>Épreuve</span>
                    </button>
                  </div>
                </div>

                <!-- Table -->
                <div class="overflow-x-auto grade-table">
                  <table class="w-full text-left text-xs">
                    <thead class="bg-slate-50/50 dark:bg-slate-900/50 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/80 font-bold">
                      <tr>
                        <th class="py-2.5 px-4">Épreuve / Matière</th>
                        <th class="py-2.5 px-4 w-28">Note (/20)</th>
                        <th class="py-2.5 px-4 w-24">Coef</th>
                        <th class="py-2.5 px-4 w-28">Bonus</th>
                        <th class="py-2.5 px-4 w-28">Note finale</th>
                        <th class="py-2.5 px-3 w-12 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
                      ${block.subjects.map(sub => `
                        <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          
                          <!-- Subject Name -->
                          <td class="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                            <input type="text" value="${sub.name}" data-block="${block.id}" data-sub="${sub.id}" data-field="name" class="w-full bg-transparent border-0 focus:ring-1 focus:ring-brand-500 rounded px-1 -mx-1 text-xs">
                          </td>

                          <!-- Raw Grade Input -->
                          <td class="py-2.5 px-4">
                            <input type="number" step="0.25" min="0" max="20" placeholder="--" value="${sub.rawGrade !== null ? sub.rawGrade : ''}" data-block="${block.id}" data-sub="${sub.id}" data-field="grade" class="w-20 font-bold text-center py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-500">
                          </td>

                          <!-- Coef Input -->
                          <td class="py-2.5 px-4">
                            <input type="number" step="0.5" min="0.5" max="20" value="${sub.coef || 1}" data-block="${block.id}" data-sub="${sub.id}" data-field="coef" class="w-16 text-center py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                          </td>

                          <!-- Bonus Dropdown (+0, +1, +2) -->
                          <td class="py-2.5 px-4">
                            <select data-block="${block.id}" data-sub="${sub.id}" data-field="bonus" class="w-24 text-xs font-semibold py-1 px-2 rounded-lg bg-brand-50/70 dark:bg-slate-800 border border-brand-200 dark:border-brand-900 text-brand-700 dark:text-brand-300 cursor-pointer">
                              <option value="0" ${sub.bonus === 0 ? 'selected' : ''}>+0 pt</option>
                              <option value="1" ${sub.bonus === 1 ? 'selected' : ''}>+1 pt ⭐</option>
                              <option value="2" ${sub.bonus === 2 ? 'selected' : ''}>+2 pts ⭐⭐</option>
                            </select>
                          </td>

                          <!-- Effective Grade with Bonus -->
                          <td class="py-2.5 px-4 font-mono font-bold ${this._getGradeTextColor(sub.effectiveGrade)}">
                            ${sub.effectiveGrade !== null ? sub.effectiveGrade.toFixed(2) : '--'}
                            ${sub.bonus > 0 ? `<span class="text-[10px] text-amber-500 font-normal ml-1">(+${sub.bonus})</span>` : ''}
                          </td>

                          <!-- Delete Action -->
                          <td class="py-2.5 px-3 text-center">
                            <button data-delete-sub="${sub.id}" data-block="${block.id}" title="Supprimer cette note" class="text-slate-400 hover:text-rose-500 p-1 rounded transition-colors">
                              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                          </td>

                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>

              </div>
            `;
          }).join('')}
        </div>

      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    this._bindEvents(container);
  },

  _getAverageBadgeClass(avg) {
    if (avg === null) return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400';
    if (avg >= 14.0) return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800';
    if (avg >= 10.0) return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/70 dark:text-teal-300 dark:border-teal-800';
    if (avg >= 8.0) return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800';
    return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800';
  },

  _getGradeTextColor(grade) {
    if (grade === null) return 'text-slate-400';
    if (grade >= 14.0) return 'text-emerald-600 dark:text-emerald-400';
    if (grade >= 10.0) return 'text-teal-600 dark:text-teal-400';
    if (grade >= 8.0) return 'text-amber-600 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
  },

  _bindEvents(container) {
    // Inputs (Grade, Name, Coef, Bonus)
    container.querySelectorAll('input[data-field], select[data-field]').forEach(input => {
      const handler = () => {
        const blockId = input.dataset.block;
        const subId = input.dataset.sub;
        const field = input.dataset.field;
        let val = input.value;

        if (field === 'grade') {
          val = val === '' ? null : parseFloat(val);
        } else if (field === 'coef' || field === 'bonus') {
          val = parseFloat(val);
        }

        store.updateGradeItem(blockId, subId, { [field]: val });
        this.render(container);
      };

      if (input.tagName === 'SELECT') {
        input.addEventListener('change', handler);
      } else {
        input.addEventListener('blur', handler);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            input.blur();
          }
        });
      }
    });

    // Add evaluation button per block
    container.querySelectorAll('[data-add-eval]').forEach(btn => {
      btn.addEventListener('click', () => {
        const blockId = btn.dataset.addEval;
        this._openAddEvalModal(blockId, container);
      });
    });

    // Delete evaluation row
    container.querySelectorAll('[data-delete-sub]').forEach(btn => {
      btn.addEventListener('click', () => {
        const blockId = btn.dataset.block;
        const subId = btn.dataset.deleteSub;
        if (confirm('Voulez-vous supprimer cette épreuve ?')) {
          store.deleteGradeItem(blockId, subId);
          Toast.info('Épreuve supprimée');
          this.render(container);
        }
      });
    });
  },

  _openAddEvalModal(blockId, container) {
    const gradesData = store.getGradesData();
    const block = gradesData.blocks.find(b => b.id === blockId);

    const content = `
      <form id="add-eval-form" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nom de l'épreuve *</label>
          <input type="text" id="eval-name" required placeholder="Ex: DS 3 / TP noté / Interro" class="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Note initiale (/20)</label>
            <input type="number" step="0.25" min="0" max="20" id="eval-grade" placeholder="Laisser vide si en attente" class="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Coefficient *</label>
            <input type="number" step="0.5" min="0.5" max="20" id="eval-coef" required value="2" class="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Points bonus</label>
          <select id="eval-bonus" class="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
            <option value="0">+0 point</option>
            <option value="1">+1 point</option>
            <option value="2">+2 points</option>
          </select>
        </div>
      </form>
    `;

    Modal.open({
      title: `Ajouter une épreuve à ${block ? block.name : 'Bloc'}`,
      content,
      footer: `
        <button id="cancel-eval-btn" class="px-4 py-2 rounded-xl text-xs font-medium text-slate-500">Annuler</button>
        <button id="save-eval-btn" class="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold">Ajouter</button>
      `,
      onOpen: (modalEl) => {
        modalEl.querySelector('#cancel-eval-btn').addEventListener('click', () => Modal.close());
        modalEl.querySelector('#save-eval-btn').addEventListener('click', () => {
          const name = modalEl.querySelector('#eval-name').value.trim();
          const gradeVal = modalEl.querySelector('#eval-grade').value;
          const coef = parseFloat(modalEl.querySelector('#eval-coef').value) || 1;
          const bonus = parseInt(modalEl.querySelector('#eval-bonus').value, 10) || 0;

          if (!name) {
            Toast.warning('Veuillez entrer un nom pour l\'épreuve.');
            return;
          }

          const newItem = {
            id: 's_' + Date.now(),
            name,
            grade: gradeVal !== '' ? parseFloat(gradeVal) : null,
            coef,
            bonus
          };

          store.addGradeItem(blockId, newItem);
          Toast.success('Épreuve ajoutée !');
          Modal.close();
          this.render(container);
        });
      }
    });
  }
};
