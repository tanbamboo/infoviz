/*
	InfoViz, StackChart
	@copyright 2012  Zheng Li <lizheng@lizheng.me>
	@github https://github.com/nocoo/InfoViz
	@license MIT
	@version 0.3.0
*/

define(function(require, exports, module) {
	seajs.use([ 'infoviz.core' ], function(core) {

		exports.draw_stackchart = function(paper, chart_area, data, overwrite_options, callback, that) {
			if(!paper || !data) return idb('Paper or Data is empty.');
			
			var options = core.merge_options(overwrite_options), cache = [], x, y, line_count = 0;
			var lines = data['data'], h_fields = [], v_fields = [], i, j, k, item;
			var h_field_name = data['horizontal_field'], v_field_name = data['vertical_field'];
			var this_h, this_v, h_min = Infinity, h_max = -Infinity, v_min = Infinity, v_max = -Infinity, v_sum_max = -Infinity;

			var element_action = function(evt) { callback.call(that, this.data('info')); };
			var element_tooltip = function(evt) {
				x = this.data('tooltip')['bar_top_x'];
				y = this.data('tooltip')['bar_top_y'];
				core.draw_tooltip(paper, x, y, this.data('tooltip')['id'], this.data('tooltip')['title'], this.data('tooltip')['content'], this.data('tooltip')['color'], options);
			};
			
			// Scan horizontal and vertical fields.
			for(var line in lines) {
				var v_sum = 0;
				
				for(i = 0; i < lines[line]['data'].length; ++i) {
					item = lines[line]['data'][i];

					// horizontal field.
					if(item[h_field_name]) {
						this_h = item[h_field_name];
					} else {
						this_h = 'N/A';
					}

					if(this_h > h_max) {
						h_max = this_h;
					}
					if(this_h < h_min) {
						h_min = this_h;
					}

					if(core.in_array(this_h, h_fields) === -1) {
						h_fields.push(this_h);
					}

					// vertical field.
					if(item[v_field_name]) {
						this_v = item[v_field_name];
					} else {
						this_v = 'N/A';
					}

					if(this_v > v_max) {
						v_max = this_v;
					}
					if(this_v < v_min) {
						v_min = this_v;
					}

					if(core.in_array(this_v, v_fields) === -1) {
						v_fields.push(this_v);
					}

					v_sum += this_v;
				}

				if(v_sum > v_sum_max) v_sum_max = v_sum;

				++line_count;
			}

			v_min = Math.floor(v_min / 10) * 10;
			v_max = Math.ceil(v_max / 10) * 10;

			// Mapping position.
			var h_start = chart_area['top-left'][0] + options['stackchart']['padding-left'];
			var v_start = chart_area['bottom-left'][1] - options['stackchart']['padding-bottom'];
			var v_unit = (v_start - chart_area['top-left'][1] - options['stackchart']['padding-top'] - options['stackchart']['bar-margin'] * (line_count - 1)) / v_sum_max;
			var h_map = {};

			// Vertical labels.
			var v_label_unit = (v_start - chart_area['top-left'][1] - options['stackchart']['padding-top']) / (options['stackchart']['vertical-label-count'] - 1);
			var v_label_value_unit = Math.floor((v_sum_max - v_min) / (options['stackchart']['vertical-label-count'] - 1)); // May not be accurate.
			
			cache = [];
			x = chart_area['top-left'][0] - options['stackchart']['vertical-bar-width'];
			y = v_start;
			var v_value = v_min;

			for(i = 0; i < options['stackchart']['vertical-label-count']; ++i) {
				cache.push('M' + x + ',' + y + 'L' + chart_area['top-left'][0] + ',' + y);

				paper.path(cache.join('')).attr({
					'stroke': options['grid']['axis-color'],
					'stroke-opacity': options['grid']['axis-alpha'],
					'stroke-width': options['grid']['axis-width']
				}).translate(0.5, 0.5);

				paper.text(x - options['stackchart']['vertical-bar-width'], y, v_value).attr({
					'text-anchor': 'end',
					'fill': options['grid']['vertical-label-color'],
					'font-size': options['grid']['vertical-label-size']
				}).translate(0.5, 0.5);

				y -= v_label_unit;
				v_value += v_label_value_unit;
			}

			// grids.
			var group_width = (chart_area['width'] - options['stackchart']['padding-left'] - options['stackchart']['padding-right'] - (h_fields.length - 1) * options['barchart']['group-margin']) / h_fields.length;
			var p_vertical_grids;
			cache = [];
			x = h_start + group_width / 2;
			y = chart_area['bottom-right'][1] + options['grid']['horizontal-name-size'] / 2 + options['grid']['horizontal-label-margin'] * 2;

			for(i = 0; i < h_fields.length; ++i) {
				cache.push('M' + x + ',' + chart_area['bottom-left'][1]);
				cache.push('L' + x + ',' + chart_area['top-left'][1]);
				
				h_map[h_fields[i]] = x - group_width / 2;

				// Draw horizontal labels.
				paper.text(x, y, h_fields[i]).attr({
					'text-anchor': 'middle',
					'font-size': options['grid']['horizontal-label-size'],
					'fill': options['grid']['horizontal-label-color']
				}).translate(0.5, 0.5);

				x += group_width + options['stackchart']['group-margin'];
			}

			p_vertical_grids = paper.path(cache.join(''));
			p_vertical_grids.attr({
				'stroke': options['grid']['grid-color'],
				'stroke-dasharray': '--..',
				'stroke-linecap': 'butt',
				'stroke-width': options['grid']['grid-width'],
				'stroke-opacity': options['grid']['grid-alpha']
			});
			p_vertical_grids.translate(0.5, 0.5);

			var group_y = {};
			for(var g in h_map) {
				group_y[g] = v_start;
			}

			// Bars.
			var index = 0, color, p_nodes = [], this_node;
			var legend_data = [];
			for(var line in lines) {
				var p_node, this_height;

				color = options['color'][(index % options['color'].length)];

				for(i = 0; i < lines[line]['data'].length; ++i) {
					item = lines[line]['data'][i];

					this_height = v_unit * item[v_field_name];

					x = h_map[item[h_field_name]];
					y = group_y[item[h_field_name]] - this_height - options['stackchart']['bar-margin'];

					this_node = paper.rect(x, y, group_width, this_height);
					this_node.attr({
						'stroke': color['color'],
						'stroke-opacity': color['dark-alpha'],
						'stroke-width': options['stackchart']['line-width'],
						'fill': color['color'],
						'fill-opacity': color['light-alpha']
					}).translate(0.5, 0.5);
					p_nodes.push(this_node);

					// Action.
					if(callback && typeof(callback) === 'function') {
						this_node.data('info', {
							'x': x,
							'y': y,
							'h_value': item[h_field_name],
							'v_value': item[v_field_name],
							'data': item
						});
						this_node.click(element_action);
					}

					// Tooltip.
					if(data['tooltip_title'] || data['tooltip_content']) {
						var title = data['tooltip_title'];
						var content = data['tooltip_content'];
						
						for(var p in item) {
							title = title.replace('{' + p + '}', item[p]);
							content = content.replace('{' + p + '}', item[p]);
						}

						this_node.data('tooltip', {
							'id': line + i,
							'title': title,
							'content': content,
							'color': color,
							'bar_top_x': x + group_width / 2,
							'bar_top_y': y
						});
						this_node.hover(element_tooltip);
					}

					group_y[item[h_field_name]] = y;
				}

				// Add legend data.
				legend_data.push({
					'label': lines[line]['name'],
					'color': color,
					'type': 'box'
				});

				index++;
			}

			core.draw_legend(paper, chart_area, legend_data, options);

			// Animation.
			for(i = 0; i < p_nodes.length; ++i) {
				(function(target) {
					target.mouseover(function () {
						target.stop().animate({ 'fill-opacity': options['color'][0]['dark-alpha'] }, options['layout']['speed'], ">");
					});
					target.mouseout(function () {
						target.stop().animate({ 'fill-opacity': options['color'][0]['light-alpha'] }, options['layout']['speed'], "<");
					});
				})(p_nodes[i]);
			}
		};
	});
});